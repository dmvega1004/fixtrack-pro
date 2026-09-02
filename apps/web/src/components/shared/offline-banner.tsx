"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncState } from "@/hooks/use-sync-state";
import { formatTime } from "@/lib/format/dates";

/**
 * Aviso único de "sin conexión" para todo el dashboard — a propósito no
 * hay un segundo aviso compitiendo en pantallas concretas (ver
 * ordenes/page.tsx, que lee del conjunto de trabajo guardado): cuando ya
 * hubo alguna sincronización exitosa (lastSyncedAt), este mismo banner se
 * vuelve más específico y dice de qué hora son los datos que se están
 * viendo. Sin eso, se queda con el aviso genérico de siempre.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { lastSyncedAt } = useSyncState();

  if (isOnline) return null;

  return (
    <div className="w-full bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
      {lastSyncedAt
        ? `Sin conexión · datos de las ${formatTime(lastSyncedAt)}`
        : "Sin conexión — algunas acciones no funcionarán hasta que vuelva la señal"}
    </div>
  );
}
