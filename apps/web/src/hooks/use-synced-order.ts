"use client";

import type { SyncWorkOrder } from "@/lib/sync/types";
import { useSyncState } from "./use-sync-state";

/** Busca una orden por id dentro del conjunto de trabajo guardado (o null si no está ahí). */
export function useSyncedOrder(orderId: string): SyncWorkOrder | null {
  const { workset } = useSyncState();
  return workset?.orders.find((order) => order.id === orderId) ?? null;
}
