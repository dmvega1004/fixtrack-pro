"use client";

import type { ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncedOrder } from "@/hooks/use-synced-order";
import { OrderDetailOffline } from "./order-detail-offline";
import { OrderNotDownloaded } from "./order-not-downloaded";

interface OrderDetailGateProps {
  orderId: string;
  userId: string;
  canManage: boolean;
  isAdmin: boolean;
  /** El detalle de hoy (header, tabs, todos sus editores), sin ningún cambio. */
  children: ReactNode;
}

/**
 * Con conexión: `children` tal cual — la pantalla de siempre, sin ningún
 * cambio. Sin conexión: swap completo a la pantalla real de detalle
 * (OrderDetailOffline, Etapa 2-C) armada desde el conjunto de trabajo
 * guardado CON los cambios pendientes de subir aplicados encima (ver
 * useSyncedOrder), o al aviso de "no descargada" si esta orden no está
 * ahí — nunca `children` (que puede traer props del servidor
 * desactualizadas, servidas por el service worker desde su caché, y sobre
 * todo trae en vivo todos los controles de escritura que esta entrega deja
 * deliberadamente desactivados: fotos, firma, repuestos, valores,
 * imprimir, cuenta de cobro, eliminar).
 *
 * `userId`/`canManage`/`isAdmin` vienen del server component (page.tsx,
 * que ya tiene la sesión) — el árbol offline los necesita para encolar
 * como el usuario correcto y para decidir qué bloques admin-only mostrar
 * (deshabilitados) en vez de ocultarlos sin más.
 */
export function OrderDetailGate({
  orderId,
  userId,
  canManage,
  isAdmin,
  children,
}: OrderDetailGateProps) {
  const isOnline = useOnlineStatus();
  const syncedOrder = useSyncedOrder(orderId);

  if (!isOnline) {
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

  return <>{children}</>;
}
