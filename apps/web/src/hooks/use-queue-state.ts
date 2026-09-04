"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type QueueSnapshot } from "@/lib/queue/state-store";
import { useOnlineStatus } from "./use-online-status";

export interface QueueState extends QueueSnapshot {
  isOnline: boolean;
}

/**
 * Estado consultable del motor de la cola (lib/queue/engine.ts): cuántas
 * operaciones pendientes, cuántas apartadas por fallo permanente, si hay
 * una pasada subiendo en este momento. Sin pantalla que lo consuma
 * todavía (eso es la Etapa 2-C) — mismo patrón que useSyncState.
 */
export function useQueueState(): QueueState {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isOnline = useOnlineStatus();
  return { ...snapshot, isOnline };
}
