"use client";

import { enqueue, runQueuePass } from "./engine";
import { registerOperationType } from "./registry";
import { getQueueStats, listOperations } from "./storage";

/**
 * Arnés de verificación de la Etapa 2-B — NO es un productor real (esa es
 * la Etapa 2-C). Registra un tipo de operación sintético ("debug.prueba")
 * contra /api/debug/cola-prueba, un endpoint que no toca ningún dato real
 * y solo devuelve el código HTTP que se le pide, para poder ejercitar la
 * clasificación de errores del motor desde la consola sin ninguna
 * pantalla ni escritura real de por medio.
 *
 * Contador local por operación (no server-side: las funciones serverless
 * no garantizan memoria entre invocaciones — ver comentario en el route
 * de fotos) para poder simular "falla las primeras N veces y después
 * funciona" de forma determinística.
 */
const debugAttemptCounts = new Map<string, number>();

function nextDebugAttempt(opId: string): number {
  const count = (debugAttemptCounts.get(opId) ?? 0) + 1;
  debugAttemptCounts.set(opId, count);
  return count;
}

registerOperationType("debug.prueba", (op) => {
  const intentoDebug = nextDebugAttempt(op.id);
  return {
    url: "/api/debug/cola-prueba",
    method: "POST",
    body: { ...(op.payload as Record<string, unknown>), intentoDebug },
  };
});

export interface DebugPayload {
  /** "ok" siempre sube. "servidor"/"conflicto" fallan `vecesAntes` veces y después suben. "invalida"/"permiso"/"inexistente"/"sesion-vencida" fallan siempre con 400/403/404/401. */
  scenario: "ok" | "servidor" | "conflicto" | "invalida" | "permiso" | "inexistente" | "sesion-vencida";
  vecesAntes?: number;
}

declare global {
  interface Window {
    __fixtrackQueue?: {
      encolar: (orderId: string, payload: DebugPayload) => Promise<unknown>;
      listar: () => Promise<unknown>;
      estadisticas: () => Promise<unknown>;
      correrPasada: () => Promise<void>;
    };
  }
}

/**
 * Cuelga funciones de prueba en window.__fixtrackQueue — ver instrucciones
 * de verificación de la Etapa 2-B. Se llama junto con startQueueEngine
 * (ver queue-engine-register.tsx).
 */
export function installQueueDebugHooks(userId: string): void {
  if (typeof window === "undefined") return;

  window.__fixtrackQueue = {
    encolar: (orderId, payload) => enqueue({ type: "debug.prueba", orderId, payload, userId }),
    listar: () => listOperations(userId),
    estadisticas: () => getQueueStats(userId),
    correrPasada: () => runQueuePass(userId),
  };
}
