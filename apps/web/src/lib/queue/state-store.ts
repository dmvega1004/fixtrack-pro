"use client";

/**
 * Estado consultable del motor de la cola — mismo patrón que
 * lib/sync/state-store.ts (estado a nivel de módulo + suscriptores),
 * porque el motor corre desde listeners de "online"/"visibilitychange",
 * no desde un componente. useQueueState (hooks/use-queue-state.ts) lo
 * expone via useSyncExternalStore.
 */

export type QueueErrorKind = "network" | "http" | "unauthorized" | null;

export interface QueueSnapshot {
  isUploading: boolean;
  pendingCount: number;
  parkedCount: number;
  lastError: QueueErrorKind;
}

type Listener = () => void;

const INITIAL_STATE: QueueSnapshot = {
  isUploading: false,
  pendingCount: 0,
  parkedCount: 0,
  lastError: null,
};

let state: QueueSnapshot = INITIAL_STATE;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function setQueueState(patch: Partial<QueueSnapshot>): void {
  state = { ...state, ...patch };
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): QueueSnapshot {
  return state;
}

export function getServerSnapshot(): QueueSnapshot {
  return INITIAL_STATE;
}
