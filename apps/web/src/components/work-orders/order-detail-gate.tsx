"use client";

import type { ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncedOrder } from "@/hooks/use-synced-order";
import { OrderDetailOffline } from "./order-detail-offline";
import { OrderNotDownloaded } from "./order-not-downloaded";

interface OrderDetailGateProps {
  orderId: string;
  /** El detalle de hoy (header, tabs, todos sus editores), sin ningún cambio. */
  children: ReactNode;
}

/**
 * Con conexión: `children` tal cual — la pantalla de siempre, sin ningún
 * cambio. Sin conexión: swap completo a una vista propia de solo lectura
 * (OrderDetailOffline) armada desde el conjunto de trabajo guardado, o al
 * aviso de "no descargada" si esta orden no está ahí — nunca `children`
 * (que puede traer props del servidor desactualizadas, servidas por el
 * service worker desde su caché, y sobre todo trae en vivo todos los
 * botones de escritura del detalle).
 */
export function OrderDetailGate({ orderId, children }: OrderDetailGateProps) {
  const isOnline = useOnlineStatus();
  const syncedOrder = useSyncedOrder(orderId);

  if (!isOnline) {
    return syncedOrder ? <OrderDetailOffline order={syncedOrder} /> : <OrderNotDownloaded />;
  }

  return <>{children}</>;
}
