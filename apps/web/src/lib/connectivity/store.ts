"use client";

/**
 * Estado de conectividad derivado de HECHOS OBSERVADOS (peticiones reales
 * que tuvieron éxito o fallaron por red/tiempo agotado) — nunca de
 * navigator.onLine en solitario. navigator.onLine puede ser manipulado por
 * extensiones del navegador y solo detecta si hay interfaz de red, no si
 * hay internet real: ya dio un falso positivo en producción.
 *
 * navigator.onLine solo se usa como PISTA para adelantar la siguiente
 * verificación (ver startHeartbeat) — jamás decide el estado por sí solo.
 */

type Listener = () => void;

const HEARTBEAT_INTERVAL_MS = 20_000;
const HEARTBEAT_TIMEOUT_MS = 5_000;

let isOffline = false;
const listeners = new Set<Listener>();
let stopHeartbeat: (() => void) | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

export function reportRequestSuccess(): void {
  if (isOffline) {
    isOffline = false;
    notify();
  }
}

export function reportRequestFailure(): void {
  if (!isOffline) {
    isOffline = true;
    notify();
  }
}

async function checkHealth(): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS);

  try {
    const response = await fetch("/api/health", {
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.ok) {
      reportRequestSuccess();
    } else {
      reportRequestFailure();
    }
  } catch {
    reportRequestFailure();
  } finally {
    clearTimeout(timer);
  }
}

function startHeartbeat(): () => void {
  void checkHealth();
  const interval = setInterval(() => void checkHealth(), HEARTBEAT_INTERVAL_MS);

  // Pistas para adelantar la siguiente verificación — nunca deciden el
  // estado por sí solas, solo disparan una comprobación real.
  const onHint = () => void checkHealth();
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") void checkHealth();
  };

  window.addEventListener("online", onHint);
  window.addEventListener("offline", onHint);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    clearInterval(interval);
    window.removeEventListener("online", onHint);
    window.removeEventListener("offline", onHint);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    stopHeartbeat = startHeartbeat();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopHeartbeat) {
      stopHeartbeat();
      stopHeartbeat = null;
    }
  };
}

export function getSnapshot(): boolean {
  return isOffline;
}

export function getServerSnapshot(): boolean {
  return false;
}
