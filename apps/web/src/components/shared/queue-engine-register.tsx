"use client";

import { useEffect } from "react";
import { startQueueEngine } from "@/lib/queue/engine";
import { installQueueDebugHooks } from "@/lib/queue/debug";

interface QueueEngineRegisterProps {
  userId: string;
}

/**
 * Arranca el motor de la cola de cambios pendientes (lib/queue/engine.ts)
 * mientras el dashboard está montado — mismo patrón que
 * SyncEngineRegister. Vive junto a él en (dashboard)/layout.tsx.
 *
 * También instala el arnés de verificación en window.__fixtrackQueue
 * (lib/queue/debug.ts) — la Etapa 2-B no conecta ninguna pantalla real,
 * esta es la única forma de encolar algo por ahora.
 */
export function QueueEngineRegister({ userId }: QueueEngineRegisterProps) {
  useEffect(() => {
    installQueueDebugHooks(userId);
    return startQueueEngine(userId);
  }, [userId]);

  return null;
}
