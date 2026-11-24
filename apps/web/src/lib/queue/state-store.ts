"use client";

/**
 * Estado consultable del motor de la cola — mismo patrón que
 * lib/sync/state-store.ts (estado a nivel de módulo + suscriptores),
 * porque el motor corre desde listeners de "online"/"visibilitychange",
 * no desde un componente. useQueueState (hooks/use-queue-state.ts) lo
 * expone via useSyncExternalStore.
 */

import type { PendingOperation } from "./types";

export type QueueErrorKind = "network" | "http" | "unauthorized" | null;

export interface QueueSnapshot {
  isUploading: boolean;
  pendingCount: number;
  parkedCount: number;
  lastError: QueueErrorKind;
  /** Operaciones del usuario actual, en orden de llegada — las lista la pantalla de estado de la cola. */
  operations: readonly PendingOperation[];
  /** `seq` de la operación que está subiendo en este instante, o null. */
  uploadingSeq: number | null;
  /** Cuándo sale el próximo reintento programado (ISO), o null si no hay ninguno. */
  nextRetryAt: string | null;
  /**
   * Operaciones sin subir de OTROS usuarios en este celular (celular
   * compartido). Solo el número: su contenido nunca se muestra.
   */
  otherUsersCount: number;
}

type Listener = () => void;

const INITIAL_STATE: QueueSnapshot = {
  isUploading: false,
  pendingCount: 0,
  parkedCount: 0,
  lastError: null,
  operations: [],
  uploadingSeq: null,
  nextRetryAt: null,
  otherUsersCount: 0,
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
