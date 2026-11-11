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
 *
 * HISTÉRESIS ASIMÉTRICA — lento para decir «no hay señal», rápido para
 * decir «ya volvió»:
 *  - Hacen falta FAILURES_TO_GO_OFFLINE fallos CONSECUTIVOS para declarar
 *    la caída. Con datos móviles un fallo suelto es normal sin que la
 *    conexión esté caída (radio dormida que tarda en despertar,
 *    retransmisiones TCP en sótanos y parqueaderos). Un aviso que parpadea
 *    es peor que no tenerlo: el técnico deja de creerle.
 *  - UN solo éxito restaura el estado de inmediato y pone el contador en 0.
 *
 * El contador es COMPARTIDO entre el latido y las peticiones reales
 * (subida de fotos, archivos de equipos). Razones:
 *  - Las peticiones reales son la señal más fresca y frecuente, y el
 *    latido ahora es una red de seguridad espaciada (ver HEARTBEAT_*). Si
 *    solo contara el latido, confirmar una caída real tardaría dos
 *    intervalos completos.
 *  - Ninguna fuente puede, sola y con un único fallo, cambiar el estado:
 *    la subida de una foto grande que se corta en datos móviles —el fallo
 *    suelto más probable— ya no enciende el aviso por sí sola.
 *  - Tras un fallo que no alcanza el umbral se programa un latido de
 *    CONFIRMACIÓN (CONFIRM_DELAY_MS después), así que la decisión siempre
 *    llega pronto, venga de donde venga el primer fallo.
 * Para que dos peticiones que fallan JUNTAS por el mismo corte de un
 * instante (ej. el latido y la carga de archivos al montar una pantalla)
 * no cuenten como dos observaciones independientes, los fallos que llegan
 * a menos de FAILURE_DEDUP_MS del anterior cuentan como uno solo.
 */

type Listener = () => void;

/**
 * 10 s: cubre el despertar de la radio (1–2 s) más dos retransmisiones TCP
 * (RTO inicial 1 s, luego 2 s y 4 s) con margen, y con la histéresis el
 * peor caso para declarar la caída sigue en ~25 s (dos tiempos límite +
 * la espera de confirmación). 12 s sumaría otros 4 s a ese peor caso sin
 * evitar falsos positivos que la histéresis no evite ya.
 */
const HEARTBEAT_TIMEOUT_MS = 10_000;

/**
 * El latido es una RED DE SEGURIDAD, no la fuente principal: las
 * peticiones reales ya reportan estado. Un ping cada 20 s mantenía la
 * radio del celular despierta todo el tiempo (batería, y cada petición
 * pagaba el costo de despertarla igual).
 *  - Pestaña visible y con señal: cada 60 s, y se SALTA si una petición
 *    real ya confirmó la conexión dentro de ese intervalo.
 *  - Sin señal: cada 15 s — lo que importa es notar rápido que volvió.
 *  - Pestaña oculta (o app en segundo plano en el APK): no hay latido. Al
 *    volver a primer plano se verifica de inmediato (visibilitychange).
 */
const HEARTBEAT_INTERVAL_ONLINE_MS = 60_000;
const HEARTBEAT_INTERVAL_OFFLINE_MS = 15_000;

const FAILURES_TO_GO_OFFLINE = 2;
const CONFIRM_DELAY_MS = 3_000;
const FAILURE_DEDUP_MS = 2_000;

let isOffline = false;
let consecutiveFailures = 0;
let lastFailureAt = 0;
let lastSuccessAt = 0;
const listeners = new Set<Listener>();
let stopHeartbeat: (() => void) | null = null;
/** Lo instala startHeartbeat; null si nadie está suscrito. */
let scheduleCheck: ((delayMs: number) => void) | null = null;

function notify(): void {
  for (const listener of listeners) listener();
}

export function reportRequestSuccess(): void {
  consecutiveFailures = 0;
  lastSuccessAt = Date.now();
  if (isOffline) {
    isOffline = false;
    notify();
  }
}

export function reportRequestFailure(): void {
  if (isOffline) return;

  const now = Date.now();
  if (consecutiveFailures > 0 && now - lastFailureAt < FAILURE_DEDUP_MS) {
    return; // mismo corte de un instante: no es una observación nueva
  }
  lastFailureAt = now;
  consecutiveFailures += 1;

  if (consecutiveFailures >= FAILURES_TO_GO_OFFLINE) {
    isOffline = true;
    notify();
  } else {
    scheduleCheck?.(CONFIRM_DELAY_MS);
  }
}

let checkInFlight = false;

async function checkHealth(): Promise<void> {
  if (checkInFlight) return;
  checkInFlight = true;

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
    checkInFlight = false;
  }
}

function startHeartbeat(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clear = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (delayMs: number) => {
    clear();
    if (document.visibilityState !== "visible") return;
    timer = setTimeout(() => void tick(), delayMs);
  };

  const scheduleNext = () =>
    schedule(isOffline ? HEARTBEAT_INTERVAL_OFFLINE_MS : HEARTBEAT_INTERVAL_ONLINE_MS);

  const tick = async () => {
    timer = null;
    const confirmedRecently =
      !isOffline &&
      consecutiveFailures === 0 &&
      Date.now() - lastSuccessAt < HEARTBEAT_INTERVAL_ONLINE_MS;
    if (!confirmedRecently) await checkHealth();
    // Si mientras tanto un fallo programó una confirmación, no se pisa.
    if (timer === null) scheduleNext();
  };

  const checkNow = () => schedule(0);

  // Pistas para adelantar la siguiente verificación — nunca deciden el
  // estado por sí solas, solo disparan una comprobación real.
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") checkNow();
    else clear();
  };

  scheduleCheck = schedule;
  checkNow();

  window.addEventListener("online", checkNow);
  window.addEventListener("offline", checkNow);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    clear();
    scheduleCheck = null;
    window.removeEventListener("online", checkNow);
    window.removeEventListener("offline", checkNow);
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
