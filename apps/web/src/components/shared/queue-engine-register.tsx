"use client";

import { useEffect } from "react";
import { startQueueEngine } from "@/lib/queue/engine";
import { installQueueDebugHooks } from "@/lib/queue/debug";
// Solo efecto de importación: registra los tipos reales de operación
// (workorder.descripcion/diagnostico/observaciones/recomendaciones/estado,
// ver ese archivo) ANTES de que el motor arranque más abajo. Debe pasar
// acá, no en cada editor: si el motor hace su primera pasada (retomando lo
// que quedó pendiente de una sesión anterior) antes de que algún editor
// llegue a montarse, encontraría tipos sin builder registrado y los
// apartaría con "sin manejador" (ver engine.ts).
import "@/lib/queue/producers";

interface QueueEngineRegisterProps {
  userId: string;
}

/** Solo en desarrollo — ver el candado idéntico en app/api/debug/cola-prueba/route.ts. */
const ALLOW_DEBUG_HOOKS = process.env.NODE_ENV !== "production";

/**
 * Arranca el motor de la cola de cambios pendientes (lib/queue/engine.ts)
 * mientras el dashboard está montado — mismo patrón que
 * SyncEngineRegister. Vive junto a él en (dashboard)/layout.tsx.
 *
 * También instala el arnés de verificación en window.__fixtrackQueue
 * (lib/queue/debug.ts) — pero SOLO en desarrollo: es un atajo para
 * encolar operaciones sintéticas desde la consola sin pasar por ninguna
 * pantalla, y dejarlo detrás de una sesión válida en producción le daría a
 * cualquier usuario autenticado una forma de mandar peticiones arbitrarias
 * a /api/debug/cola-prueba desde la consola del navegador.
 */
export function QueueEngineRegister({ userId }: QueueEngineRegisterProps) {
  useEffect(() => {
    if (ALLOW_DEBUG_HOOKS) installQueueDebugHooks(userId);
    return startQueueEngine(userId);
  }, [userId]);

  return null;
}
