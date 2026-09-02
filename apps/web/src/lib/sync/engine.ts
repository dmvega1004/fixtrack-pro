"use client";

import { SYNC_PAYLOAD_VERSION } from "./payload-version";
import type { SyncPayload } from "./types";
import { clearWorkset, loadWorkset, saveWorkset, type StoredWorkset } from "./storage";
import { setSyncState } from "./state-store";

/** Prefijo fijo para poder filtrar la consola por "[sync]" al verificar. */
const LOG = "[sync]";

/**
 * Piso entre sincronizaciones disparadas por "volver al primer plano"
 * (visibilitychange) — 5 minutos: bastante para que alternar entre
 * FixTrack y otra app (mapa, cámara, llamada) veinte veces en una hora
 * no dispare veinte sincronizaciones (cada una son hasta ~100 llamadas
 * al backend: hasta 3 para listar + 2 por orden para fotos/repuestos, ver
 * route.ts), y bastante corto para que los datos no se sientan viejos
 * durante una jornada de trabajo activa. El disparo por "conexión
 * recuperada" (evento online) SÍ se lo salta a propósito — se llama con
 * force=true — porque ahí sincronizar de inmediato es justo el punto.
 */
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Nunca dos sincronizaciones a la vez: si ya hay una en curso, la nueva
 * se descarta en vez de encolarse — ver runSync().
 */
let syncInFlight = false;

/** Instante del último INTENTO (no solo los exitosos) — ver MIN_SYNC_INTERVAL_MS. */
let lastAttemptAt = 0;

/**
 * Arranca el motor para `userId`: valida lo guardado (dueño + versión),
 * dispara la sincronización inicial, y engancha los eventos "online" y
 * "visibilitychange" (este último es el caso más frecuente en celular —
 * volver a la app desde segundo plano no dispara "online" si la señal
 * nunca se perdió del todo).
 *
 * Sincrónico a propósito: se puede llamar directo desde un useEffect sin
 * encadenar promesas para obtener la función de limpieza.
 */
export function startSyncEngine(userId: string): () => void {
  void bootstrap(userId);

  const handleOnline = () => {
    console.log(`${LOG} conexión recuperada — resincronizando (sin importar el intervalo mínimo)`);
    void runSync(userId, { force: true });
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    console.log(`${LOG} app en primer plano — evaluando resincronización`);
    void runSync(userId);
  };

  window.addEventListener("online", handleOnline);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("online", handleOnline);
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
  await runSync(userId);
}

/**
 * Llama a /api/sincronizacion y guarda el resultado. Si falla (red o
 * servidor), lo guardado NO se toca — perder el conjunto de trabajo por
 * un fallo de red sería peor que quedarse con una copia vieja. Un 401 es
 * sesión vencida, no un fallo de red: se registra aparte y no se
 * reintenta en bucle (no hay ningún setTimeout de reintento acá).
 *
 * `force` salta el intervalo mínimo (MIN_SYNC_INTERVAL_MS) — lo usa
 * únicamente el disparo por "conexión recuperada". El guard de
 * concurrencia (syncInFlight) NUNCA se salta, con o sin force.
 */
export async function runSync(userId: string, options: { force?: boolean } = {}): Promise<void> {
  if (syncInFlight) {
    console.log(`${LOG} ya hay una sincronización en curso — se descarta esta`);
    return;
  }

  if (!options.force) {
    const elapsedMs = Date.now() - lastAttemptAt;
    if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
      const remainingS = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsedMs) / 1000);
      console.log(
        `${LOG} última sincronización hace ${Math.round(elapsedMs / 1000)}s, faltan ${remainingS}s para el mínimo — se descarta`,
      );
      return;
    }
  }

  lastAttemptAt = Date.now();
  syncInFlight = true;
  setSyncState({ isSyncing: true });

  try {
    const response = await fetch("/api/sincronizacion", { cache: "no-store" });

    if (response.status === 401) {
      console.warn(`${LOG} sesión vencida (401) — no se reintenta, se conserva lo guardado`);
      setSyncState({ isSyncing: false, lastError: "unauthorized" });
      return;
    }

    if (!response.ok) {
      console.warn(
        `${LOG} respuesta ${response.status} del servidor — se conserva lo guardado`,
      );
      setSyncState({ isSyncing: false, lastError: "http" });
      return;
    }

    const payload = (await response.json()) as SyncPayload;

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
    setSyncState({
      isSyncing: false,
      lastSyncedAt: payload.syncedAt,
      workset: payload,
      lastError: null,
    });
  } catch (error) {
    console.warn(`${LOG} fallo al sincronizar — se conserva lo guardado`, error);
    setSyncState({ isSyncing: false, lastError: "network" });
  } finally {
    syncInFlight = false;
  }
}
