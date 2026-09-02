"use client";

import type { SyncPayload } from "./types";

/**
 * Estado consultable del motor de sincronización — mismo patrón que
 * lib/connectivity/store.ts (estado a nivel de módulo + suscriptores),
 * porque el motor mismo es un módulo plano fuera del árbol de React
 * (corre desde listeners de "online"/"visibilitychange"), no un
 * componente. useSyncState (hooks/use-sync-state.ts) lo expone via
 * useSyncExternalStore.
 */

export type SyncErrorKind = "network" | "unauthorized" | "http" | null;

export interface SyncSnapshot {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  workset: SyncPayload | null;
  lastError: SyncErrorKind;
}

type Listener = () => void;

const INITIAL_STATE: SyncSnapshot = {
  isSyncing: false,
  lastSyncedAt: null,
  workset: null,
  lastError: null,
};

let state: SyncSnapshot = INITIAL_STATE;
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function setSyncState(patch: Partial<SyncSnapshot>): void {
  state = { ...state, ...patch };
  notify();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): SyncSnapshot {
  return state;
}

export function getServerSnapshot(): SyncSnapshot {
  return INITIAL_STATE;
}
