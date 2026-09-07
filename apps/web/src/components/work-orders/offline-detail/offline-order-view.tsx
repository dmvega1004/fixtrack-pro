"use client";

import { useSyncedOrder } from "@/hooks/use-synced-order";
import { OrderDetailOffline } from "./order-detail-offline";
import { OrderNotDownloaded } from "./order-not-downloaded";

interface OfflineOrderViewProps {
  orderId: string;
  userId: string;
  canManage: boolean;
  isAdmin: boolean;
}

/**
 * syncedOrder (conjunto de trabajo + cambios pendientes encima, ver
 * useSyncedOrder) ? el detalle real de esa orden : el aviso de "no
 * descargada". Compartido por dos entradas distintas a la misma decisión:
 * OrderDetailGate (Etapa 2-C — ya conoce el orderId, viene del árbol
 * server-rendered de /ordenes/[id]) y OrderDetailOfflineByPath (Etapa 2-D
 * — lo saca de la URL real, porque esta pantalla se sirve genérica desde
 * el service worker para CUALQUIER orden, ver ese archivo).
 *
 * `orderId === ""` (aún no se conoce, o la URL no traía uno) nunca
 * encuentra nada en useSyncedOrder — cae en OrderNotDownloaded, nunca en
 * datos de otra orden.
 */
export function OfflineOrderView({
  orderId,
  userId,
  canManage,
  isAdmin,
}: OfflineOrderViewProps) {
  const syncedOrder = useSyncedOrder(orderId);

  return syncedOrder ? (
    <OrderDetailOffline
      order={syncedOrder}
      userId={userId}
      canManage={canManage}
      isAdmin={isAdmin}
    />
  ) : (
    <OrderNotDownloaded />
  );
}
