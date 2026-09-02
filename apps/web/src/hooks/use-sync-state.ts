"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type SyncSnapshot } from "@/lib/sync/state-store";
import { useOnlineStatus } from "./use-online-status";

export interface SyncState extends SyncSnapshot {
  isOnline: boolean;
}

/**
 * Estado consultable del motor de sincronización (lib/sync/engine.ts):
 * si hay conexión (reutiliza useOnlineStatus, el mismo hecho observado
 * que usa el resto de la app — no una detección propia), si está
 * sincronizando, cuándo fue la última sincronización exitosa, y el
 * conjunto de trabajo guardado. Sin pantalla que lo consuma todavía
 * (eso es la Etapa 1-C-2) — el motor sincroniza y guarda igual, este
 * hook solo lee el resultado.
 */
export function useSyncState(): SyncState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOnline = useOnlineStatus();
  return { ...snapshot, isOnline };
}
