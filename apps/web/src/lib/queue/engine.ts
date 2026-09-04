"use client";

import { getSnapshot as getConnectivitySnapshot } from "../connectivity/store";
import { getOperationRequestBuilder } from "./registry";
import {
  getNextOperation,
  getQueueStats,
  insertOperation,
  removeOperation,
  updateOperation,
} from "./storage";
import { setQueueState } from "./state-store";
import type { EnqueueInput, PendingOperation } from "./types";

/** Prefijo fijo para poder filtrar la consola por "[cola]" al verificar. */
const LOG = "[cola]";

/**
 * Tope de reintentos para fallos temporales (red / 5xx) antes de apartar
 * la operación — sin esto, un servidor genuinamente caído bloquearía el
 * resto de la cola detrás de esa operación para siempre (ver runPass:
 * el orden es estricto, un fallo temporal detiene la pasada ahí mismo).
 * Con espera creciente (ver backoffDelayMs) más los reintentos que
 * disparan volver a tener señal / volver la app al primer plano, da
 * margen de horas de señal intermitente antes de apartar. Decidido con
 * el usuario — ver conversación de la Etapa 2-B.
 */
const MAX_RETRYABLE_ATTEMPTS = 10;

/** Base y tope de la espera creciente entre reintentos por red/5xx. */
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;

/**
 * Espera fija (no creciente) para el reintento tras un 409 de idempotencia
 * — no es un fallo real, se espera a que la reserva del servidor se
 * resuelva (ver RESERVATION_WINDOW_MS = 120s en el interceptor de la
 * Etapa 2-A), no hace falta backoff exponencial para eso.
 */
const IDEMPOTENCY_RETRY_DELAY_MS = 15_000;

function backoffDelayMs(attempts: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(attempts - 1, 0), BACKOFF_MAX_MS);
}

/** Nunca dos pasadas a la vez, sin importar qué disparador la pidió. */
let passInFlight = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function clearRetryTimer(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function scheduleRetry(userId: string, delayMs: number): void {
  clearRetryTimer();
  console.log(`${LOG} próximo reintento en ${Math.round(delayMs / 1000)}s`);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void runQueuePass(userId);
  }, delayMs);
}

/**
 * Arranca el motor para `userId`: hace una pasada inicial (retoma lo que
 * haya quedado pendiente de una sesión anterior) y engancha "online"/
 * "visibilitychange" — mismos disparadores que el motor de sincronización
 * (ver ../sync/engine.ts) y misma razón: "visibilitychange" es el caso
 * más frecuente en celular, volver a la app no siempre dispara "online".
 */
export function startQueueEngine(userId: string): () => void {
  void refreshStats(userId);
  void runQueuePass(userId);

  const handleOnline = () => {
    console.log(`${LOG} conexión recuperada — subiendo cola pendiente`);
    clearRetryTimer();
    void runQueuePass(userId);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    console.log(`${LOG} app en primer plano — subiendo cola pendiente`);
    clearRetryTimer();
    void runQueuePass(userId);
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("online", handleOnline);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    clearRetryTimer();
  };
}

/**
 * Encola una operación y, si hay señal (estado de conectividad verificado
 * de lib/connectivity/store — nunca navigator.onLine en solitario, ver
 * ese módulo), dispara una pasada de inmediato. Sin señal, queda
 * guardada y la sube el próximo disparador ("online", primer plano).
 *
 * Punto único de entrada para encolar — nadie debe llamar a
 * storage.insertOperation() directo, así ningún productor se olvida de
 * disparar la subida.
 */
export async function enqueue(input: EnqueueInput): Promise<PendingOperation> {
  const op = await insertOperation(input);
  console.log(`${LOG} #${op.seq} (${op.type}) encolada — orden=${op.orderId}, id=${op.id}`);
  await refreshStats(input.userId);

  if (getConnectivitySnapshot()) {
    console.log(`${LOG} encolada sin señal — se sube cuando vuelva la conexión`);
  } else {
    clearRetryTimer();
    void runQueuePass(input.userId);
  }

  return op;
}

async function refreshStats(userId: string): Promise<void> {
  const stats = await getQueueStats(userId);
  setQueueState({ pendingCount: stats.pending, parkedCount: stats.parked });
}

type AttemptOutcome = "success" | "parked" | "retry-later" | "unauthorized";

/**
 * Sube la cola de `userId` en estricto orden de llegada, una operación a
 * la vez. Un fallo temporal (red/5xx/409) DETIENE la pasada en esa
 * operación — la retoma el próximo disparador o el reintento programado
 * (scheduleRetry). Una operación apartada (permanente o tope alcanzado)
 * NO detiene la pasada: sigue con las que quedan.
 */
export async function runQueuePass(userId: string): Promise<void> {
  if (passInFlight) {
    console.log(`${LOG} ya hay una pasada en curso — se descarta esta`);
    return;
  }

  passInFlight = true;
  setQueueState({ isUploading: true });

  try {
    for (;;) {
      const op = await getNextOperation(userId);
      if (!op) {
        console.log(`${LOG} nada pendiente por subir`);
        setQueueState({ lastError: null });
        break;
      }

      const outcome = await attemptUpload(op);
      if (outcome === "success" || outcome === "parked") continue;
      break; // retry-later | unauthorized: se detiene la pasada acá
    }
  } finally {
    passInFlight = false;
    setQueueState({ isUploading: false });
    await refreshStats(userId);
  }
}

async function attemptUpload(op: PendingOperation): Promise<AttemptOutcome> {
  const builder = getOperationRequestBuilder(op.type);

  if (!builder) {
    // No debería pasar si solo se encola lo que la Etapa 2-C registra —
    // defensivo: aparta en vez de reintentar en bucle contra un tipo que
    // nunca va a poder subirse, y no bloquea el resto de la cola.
    console.error(`${LOG} #${op.seq} sin manejador registrado para tipo "${op.type}" — se aparta`);
    await updateOperation({ ...op, parked: true, lastError: `sin manejador para "${op.type}"` });
    return "parked";
  }

  const { url, method, body } = builder(op);
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "Idempotency-Key": op.id },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    console.warn(`${LOG} #${op.seq} (${op.type}) fallo de red — se reintenta con espera creciente`, error);
    setQueueState({ lastError: "network" });
    return retryOrPark(op, "network");
  }

  if (response.ok) {
    console.log(`${LOG} #${op.seq} (${op.type}) subida — ${response.status}`);
    await removeOperation(op.seq);
    setQueueState({ lastError: null });
    return "success";
  }

  if (response.status === 409) {
    // Mecanismo de idempotencia (Etapa 2-A): esta MISMA operación se está
    // procesando ahora mismo con esta llave. NO es un fallo: se reintenta
    // más tarde y encontrará la respuesta guardada (o, si la reserva
    // quedó abandonada, la retoma y la ejecuta de verdad). No cuenta para
    // el tope de reintentos ni se toca `attempts`/`lastError` — no hay
    // nada que reportar como error.
    console.log(
      `${LOG} #${op.seq} (${op.type}) 409 — operación en curso por idempotencia, NO es un error, se reintenta en ${IDEMPOTENCY_RETRY_DELAY_MS / 1000}s`,
    );
    scheduleRetry(op.userId, IDEMPOTENCY_RETRY_DELAY_MS);
    return "retry-later";
  }

  if (response.status === 401) {
    // Sesión vencida — no es que la operación esté mal. Se detiene la
    // pasada entera sin marcar nada como fallido y sin reintentar en
    // bucle (mismo criterio que el motor de sincronización).
    console.warn(`${LOG} #${op.seq} (${op.type}) 401 — sesión vencida, se detiene la pasada`);
    setQueueState({ lastError: "unauthorized" });
    return "unauthorized";
  }

  if (response.status === 400 || response.status === 403 || response.status === 404) {
    const message = await readErrorMessage(response);
    console.error(
      `${LOG} #${op.seq} (${op.type}) ${response.status} — fallo permanente, se aparta y se SIGUE con las demás: ${message}`,
    );
    await updateOperation({ ...op, parked: true, lastError: `http-${response.status}: ${message}` });
    return "parked";
  }

  // 5xx u otro código inesperado: temporal.
  const message = await readErrorMessage(response);
  console.warn(
    `${LOG} #${op.seq} (${op.type}) ${response.status} — fallo temporal del servidor, se reintenta con espera creciente: ${message}`,
  );
  setQueueState({ lastError: "http" });
  return retryOrPark(op, `http-${response.status}: ${message}`);
}

/** Común a red y 5xx: incrementa `attempts`, aparta si llegó al tope, si no programa el próximo reintento. */
async function retryOrPark(op: PendingOperation, reason: string): Promise<AttemptOutcome> {
  const attempts = op.attempts + 1;

  if (attempts >= MAX_RETRYABLE_ATTEMPTS) {
    console.error(
      `${LOG} #${op.seq} (${op.type}) ${attempts} intentos fallidos — tope alcanzado, se aparta para no bloquear el resto de la cola`,
    );
    await updateOperation({ ...op, attempts, parked: true, lastError: `${reason} (tope de ${MAX_RETRYABLE_ATTEMPTS} intentos)` });
    return "parked";
  }

  await updateOperation({ ...op, attempts, lastError: reason });
  scheduleRetry(op.userId, backoffDelayMs(attempts));
  return "retry-later";
}

async function readErrorMessage(response: Response): Promise<string> {
  const data: unknown = await response.json().catch(() => null);
  const message = (data as { message?: string | string[] } | null)?.message;
  if (Array.isArray(message)) return message.join("; ");
  return message ?? response.statusText ?? "Error";
}
