"use client";

import type { ReactNode } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OfflineOrderView } from "./offline-detail/offline-order-view";

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
 * cambio. Sin conexión: swap completo a OfflineOrderView (Etapa 2-C/2-D) —
 * nunca `children` (que puede traer props del servidor desactualizadas,
 * servidas por el service worker desde su caché, y sobre todo trae en
 * vivo todos los controles de escritura que esta entrega deja
 * deliberadamente desactivados: fotos, firma, repuestos, valores,
 * imprimir, cuenta de cobro, eliminar).
 *
 * Esta es la entrada que ya tenía `orderId` de antes (viene del árbol
 * server-rendered de /ordenes/[id]) — la otra entrada a OfflineOrderView
 * es OrderDetailOfflineByPath (Etapa 2-D), para cuando ni siquiera esa
 * navegación llegó a tener señal (ver sw.js).
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

  if (!isOnline) {
    return (
      <OfflineOrderView
        orderId={orderId}
        userId={userId}
        canManage={canManage}
        isAdmin={isAdmin}
      />
    );
  }

  return <>{children}</>;
}
