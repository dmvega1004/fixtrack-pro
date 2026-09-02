"use client";

import { useEffect } from "react";
import { startSyncEngine } from "@/lib/sync/engine";

interface SyncEngineRegisterProps {
  userId: string;
}

/**
 * Arranca el motor de sincronización (lib/sync/engine.ts) mientras el
 * dashboard está montado — igual patrón que ServiceWorkerRegister. Vive
 * en (dashboard)/layout.tsx, que persiste entre navegaciones dentro del
 * dashboard (no se remonta en cada página), así que esto corre una vez
 * "al cargar la aplicación" y no en cada cambio de pantalla.
 */
export function SyncEngineRegister({ userId }: SyncEngineRegisterProps) {
  useEffect(() => {
    return startSyncEngine(userId);
  }, [userId]);

  return null;
}
