"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="w-full bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
      Sin conexión — algunas acciones no funcionarán hasta que vuelva la señal
    </div>
  );
}
