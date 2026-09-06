"use client";

import { useSyncExternalStore } from "react";
import type { SyncWorkOrder } from "@/lib/sync/types";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/queue/pending-changes";
import { useSyncState } from "./use-sync-state";

/**
 * Busca una orden por id dentro del conjunto de trabajo guardado, CON los
 * cambios pendientes de subir aplicados encima (ver lib/queue/pending-changes.ts) —
 * este es el único punto de lectura offline de una orden en toda la
 * aplicación; cualquier pantalla que llegue a necesitar el detalle de una
 * orden sin señal debe pasar por acá, no leer el conjunto de trabajo
 * directo, para heredar la mezcla automáticamente.
 *
 * Sigue siendo cierto después de que el motor de sincronización reemplace
 * el conjunto de trabajo con datos frescos del servidor mientras la
 * operación sigue subiendo: el parche se aplica en cada lectura, no se
 * "graba" sobre el conjunto de trabajo guardado.
 */
export function useSyncedOrder(orderId: string): SyncWorkOrder | null {
  const { workset } = useSyncState();
  const pendingPatches = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const order = workset?.orders.find((o) => o.id === orderId) ?? null;
  if (!order) return null;

  const patch = pendingPatches.get(orderId);
  return patch ? { ...order, ...patch } : order;
}
