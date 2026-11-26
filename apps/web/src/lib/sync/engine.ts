"use client";

import { SYNC_PAYLOAD_VERSION } from "./payload-version";
import type { SyncPayload } from "./types";
import { clearWorkset, loadWorkset, saveWorkset, type StoredWorkset } from "./storage";
import { setSyncState } from "./state-store";
import { getSnapshot as getConnectivitySnapshot } from "../connectivity/store";

/** Prefijo fijo para poder filtrar la consola por "[sync]" al verificar. */
const LOG = "[sync]";

/**
 * Piso entre sincronizaciones disparadas por "volver al primer plano"
 * (visibilitychange) — 5 minutos: bastante para que alternar entre
 * FixTrack y otra app (mapa, cámara, llamada) veinte veces en una hora
 * no dispare veinte sincronizaciones (cada una son hasta ~100 llamadas
 * al backend: hasta 3 para listar + 2 por orden para fotos/repuestos, ver
 * route.ts), y bastante corto para que los datos no se sientan viejos
 * durante una jornada de trabajo activa.
 *
 * El regreso de la señal (evento online o detección propia) YA NO se lo
 * salta: lo dispara el motor de la cola DESPUÉS de subir lo pendiente y
 * sin forzar (ver onSignalBack en ../queue/engine.ts). Forzarlo hacía que
 * cada caída y vuelta de los datos móviles costara ~100 llamadas al
 * backend (prueba de campo 2026-11-24). Solo «deslizar para refrescar»
 * fuerza, porque es el técnico pidiéndolo explícitamente.
 */
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Tiempo límite de una sincronización completa, cuerpo incluido. Sin él,
 * con señal que parece estar pero no pasa nada, la petición quedaba
 * colgada y syncInFlight en true hasta recargar: ninguna otra
 * sincronización volvía a correr. 30 s porque la respuesta es grande
 * (hasta 50 órdenes con fotos y repuestos) y el servidor hace ~100
 * llamadas al backend para armarla.
 */
const SYNC_TIMEOUT_MS = 30_000;

/**
 * Nunca dos sincronizaciones a la vez: si ya hay una en curso, la nueva
 * se descarta en vez de encolarse — ver runSync().
 */
let syncInFlight = false;

/**
 * Inicio del último intento que CUENTA para la ventana de
 * MIN_SYNC_INTERVAL_MS: los que llegaron a tener respuesta (éxito, 401,
 * 5xx, cuerpo cortado) y los que agotaron el tiempo límite. NO cuenta el
 * fallo de red inmediato (fetch rechaza antes de cualquier respuesta, p.
 * ej. modo avión): no le costó nada al servidor, y contarlo bloqueaba la
 * sincronización al volver la señal hasta 5 min (prueba de campo
 * 2026-11-24: fallo a las 22:57:14, la buena recién a las 23:05:27).
 * El tiempo agotado SÍ cuenta: la petición pudo llegar y el servidor
 * hacer sus ~100 llamadas aunque la respuesta no volviera.
 */
let lastAttemptAt = 0;

/** Para el diagnóstico (/perfil/diagnostico): solo lectura. */
/**
 * Quién pidió la sincronización — solo para el diagnóstico (prueba de
 * campo 2026-11-24: no había forma de saber qué disparó un intento).
 */
export type SyncTrigger = "arranque" | "primer plano" | "regreso de señal" | "deslizar";

export interface SyncEngineDiagnostics {
  inFlightSince: number | null;
  inFlightTrigger: SyncTrigger | null;
  last: { finishedAt: number; durationMs: number; result: string; trigger: SyncTrigger } | null;
  /** Último pedido descartado SIN llamar al servidor (sin señal, ventana, en curso). */
  lastSkipped: { at: number; trigger: SyncTrigger; reason: string } | null;
  /** Hasta cuándo una sincronización SIN forzar se descarta; null = libre. */
  windowUntil: number | null;
}
let inFlightSince: number | null = null;
let inFlightTrigger: SyncTrigger | null = null;
let lastResult: SyncEngineDiagnostics["last"] = null;
let lastSkipped: SyncEngineDiagnostics["lastSkipped"] = null;

function skip(trigger: SyncTrigger, reason: string): void {
  console.log(`${LOG} (${trigger}) ${reason} — se descarta`);
  lastSkipped = { at: Date.now(), trigger, reason };
}

export function getSyncEngineDiagnostics(): SyncEngineDiagnostics {
  const until = lastAttemptAt + MIN_SYNC_INTERVAL_MS;
  return {
    inFlightSince,
    inFlightTrigger,
    last: lastResult,
    lastSkipped,
    windowUntil: until > Date.now() ? until : null,
  };
}

/**
 * Arranca el motor para `userId`: valida lo guardado (dueño + versión),
 * dispara la sincronización inicial, y engancha "visibilitychange" (volver
 * a la app desde segundo plano). El regreso de la señal lo maneja el
 * motor de la cola — ver MIN_SYNC_INTERVAL_MS.
 *
 * Sincrónico a propósito: se puede llamar directo desde un useEffect sin
 * encadenar promesas para obtener la función de limpieza.
 */
export function startSyncEngine(userId: string): () => void {
  void bootstrap(userId);

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    console.log(`${LOG} app en primer plano — evaluando resincronización`);
    void runSync(userId, { trigger: "primer plano" });
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

/**
 * Corre una vez al arrancar el motor: revisa si lo guardado sigue siendo
 * válido para este usuario y esta versión de payload ANTES de confiar en
 * él, y dispara la sincronización "al cargar la aplicación".
 */
async function bootstrap(userId: string): Promise<void> {
  const existing = await loadWorkset().catch((error) => {
    console.error(`${LOG} no se pudo leer el almacén local`, error);
    return null;
  });

  if (existing) {
    if (existing.userId !== userId) {
      console.log(`${LOG} el almacén guardado es de otro usuario — se descarta`);
      await clearWorkset().catch(() => {});
      setSyncState({ workset: null, lastSyncedAt: null });
    } else if (existing.payloadVersion !== SYNC_PAYLOAD_VERSION) {
      console.log(
        `${LOG} payloadVersion desactualizado (guardado=${existing.payloadVersion}, esperado=${SYNC_PAYLOAD_VERSION}) — se descarta`,
      );
      await clearWorkset().catch(() => {});
      setSyncState({ workset: null, lastSyncedAt: null });
    } else {
      console.log(
        `${LOG} conjunto de trabajo previo cargado del almacén — ${existing.payload.orders.length} órdenes, syncedAt=${existing.syncedAt}`,
      );
      setSyncState({ workset: existing.payload, lastSyncedAt: existing.syncedAt });
    }
  } else {
    console.log(`${LOG} sin conjunto de trabajo guardado todavía`);
  }

  console.log(`${LOG} sincronizando al cargar la aplicación`);
  await runSync(userId, { trigger: "arranque" });
}

/**
 * Llama a /api/sincronizacion y guarda el resultado. Si falla (red o
 * servidor), lo guardado NO se toca — perder el conjunto de trabajo por
 * un fallo de red sería peor que quedarse con una copia vieja. Un 401 es
 * sesión vencida, no un fallo de red: se registra aparte y no se
 * reintenta en bucle (no hay ningún setTimeout de reintento acá).
 *
 * Sin forzar, tampoco se intenta si la detección propia ya dice «sin
 * señal» (lib/connectivity/store): no hay nada que ganar, y antes cada
 * vuelta al primer plano sin señal salía igual a la red. Ojo: justo
 * después de perder la señal la app todavía no lo sabe (hacen falta 2
 * fallos); ese intento falla en el acto y, como fallo de red, no consume
 * la ventana (ver lastAttemptAt).
 *
 * `force` salta el intervalo mínimo (MIN_SYNC_INTERVAL_MS) y la
 * comprobación de señal — lo usa únicamente «deslizar para refrescar», que
 * ya revisa la señal por su cuenta. El guard de concurrencia
 * (syncInFlight) NUNCA se salta, con o sin force.
 */
export async function runSync(
  userId: string,
  options: { force?: boolean; trigger: SyncTrigger },
): Promise<void> {
  const { trigger } = options;

  if (syncInFlight) {
    skip(trigger, "ya hay una sincronización en curso");
    return;
  }

  if (!options.force) {
    if (getConnectivitySnapshot()) {
      skip(trigger, "la app sabe que está sin señal");
      return;
    }
    const elapsedMs = Date.now() - lastAttemptAt;
    if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
      const remainingS = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsedMs) / 1000);
      skip(trigger, `ventana de 5 min (faltan ${remainingS} s)`);
      return;
    }
  }

  const startedAt = Date.now();
  syncInFlight = true;
  inFlightSince = startedAt;
  inFlightTrigger = trigger;
  setSyncState({ isSyncing: true });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);
  let result = "desconocido";

  try {
    const response = await fetch("/api/sincronizacion", {
      cache: "no-store",
      signal: controller.signal,
    });
    // Hubo respuesta: el servidor hizo el trabajo, cuenta para la ventana
    // pase lo que pase después (401, 5xx, cuerpo cortado).
    lastAttemptAt = startedAt;

    if (response.status === 401) {
      console.warn(`${LOG} sesión vencida (401) — no se reintenta, se conserva lo guardado`);
      result = "sesión vencida (401)";
      setSyncState({ isSyncing: false, lastError: "unauthorized" });
      return;
    }

    if (!response.ok) {
      console.warn(
        `${LOG} respuesta ${response.status} del servidor — se conserva lo guardado`,
      );
      result = `error del servidor (${response.status})`;
      setSyncState({ isSyncing: false, lastError: "http" });
      return;
    }

    // Dentro del tiempo límite también: el cuerpo es grande y es justo lo
    // que se queda a medias en una conexión que se muere.
    const payload = (await response.json()) as SyncPayload;
    clearTimeout(timer);

    const record: StoredWorkset = {
      userId,
      syncedAt: payload.syncedAt,
      payloadVersion: payload.payloadVersion,
      payload,
    };
    await saveWorkset(record);

    console.log(
      `${LOG} guardado — ${payload.orders.length} órdenes, syncedAt=${payload.syncedAt}`,
    );
    result = `ok (${payload.orders.length} órdenes)`;
    setSyncState({
      isSyncing: false,
      lastSyncedAt: payload.syncedAt,
      workset: payload,
      lastError: null,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    // Tiempo agotado cuenta (ver lastAttemptAt); el fallo de red inmediato no.
    if (timedOut) lastAttemptAt = startedAt;
    result = timedOut
      ? `sin respuesta en ${SYNC_TIMEOUT_MS / 1000}s`
      : `falló (${error instanceof Error ? error.name : "error"})`;
    console.warn(`${LOG} ${result} al sincronizar — se conserva lo guardado`, error);
    setSyncState({ isSyncing: false, lastError: timedOut ? "timeout" : "network" });
  } finally {
    clearTimeout(timer);
    syncInFlight = false;
    const finishedAt = Date.now();
    lastResult = { finishedAt, durationMs: finishedAt - startedAt, result, trigger };
    inFlightSince = null;
    inFlightTrigger = null;
  }
}
