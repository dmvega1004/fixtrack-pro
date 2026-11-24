"use client";

import { useSyncExternalStore } from "react";

/**
 * Abierto/cerrado del panel de estado de la cola — a nivel de módulo
 * porque lo abren lugares sin relación entre sí (la franja de arriba, la
 * fila de la barra lateral, el aviso al cerrar sesión).
 */
let open = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setQueuePanelOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  for (const listener of listeners) listener();
}

export function openQueuePanel(): void {
  setQueuePanelOpen(true);
}

export function useQueuePanelOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}
