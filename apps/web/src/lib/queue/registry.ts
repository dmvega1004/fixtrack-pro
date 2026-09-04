"use client";

import type { OperationRequestBuilder } from "./types";

/**
 * Mapa tipo de operación → cómo subirla (URL/método/body). Vacío en la
 * Etapa 2-B a propósito: la cola y el motor son infraestructura, ningún
 * tipo real está conectado todavía. La Etapa 2-C llama a
 * registerOperationType() por cada pantalla que empiece a encolar.
 *
 * El motor (engine.ts) es quien arma el fetch y pone la cabecera
 * Idempotency-Key SIEMPRE — el builder solo describe la petición, nunca
 * la ejecuta. Así ningún productor puede olvidarse de la cabecera.
 */
const builders = new Map<string, OperationRequestBuilder>();

export function registerOperationType(type: string, builder: OperationRequestBuilder): void {
  builders.set(type, builder);
}

export function getOperationRequestBuilder(type: string): OperationRequestBuilder | undefined {
  return builders.get(type);
}
