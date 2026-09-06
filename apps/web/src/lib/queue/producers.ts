"use client";

import type { OrderStatus } from "@/components/shared/status-chip";
import { enqueue } from "./engine";
import {
  STATUS_OPERATION_TYPE,
  TEXT_FIELD_OPERATION_TYPES,
  type StatusPayload,
  type TextFieldPayload,
  type WorkOrderTextField,
} from "./field-operations";
import { registerOperationType } from "./registry";
import type { PendingOperation } from "./types";

/**
 * Primeros productores reales de la cola (Etapa 2-C) — hasta acá, el
 * registro solo tenía el tipo sintético de depuración (ver ./debug.ts).
 * Los cinco viajan al MISMO endpoint (PATCH /work-orders/:id acepta cada
 * campo de forma independiente, ver UpdateWorkOrderDto en el backend), así
 * que comparten un solo builder — separados por tipo igual, para que cada
 * operación en la cola diga con claridad qué campo está subiendo (útil el
 * día que exista una pantalla de estado de la cola).
 *
 * El proxy es /api/ordenes/:id (Next.js), no /work-orders/:id directo: el
 * navegador no tiene el Bearer del backend (vive en una cookie httpOnly,
 * ver server-fetch.ts) — el proxy lo agrega del lado del servidor. El
 * motor (engine.ts) es quien pone Idempotency-Key en la petición; este
 * archivo solo describe la forma del body.
 *
 * Se registra apenas se importa este módulo (ver el efecto en
 * queue-engine-register.tsx) — nada que llamar aparte.
 */
function buildFieldRequest(field: WorkOrderTextField) {
  return (op: PendingOperation) => ({
    url: `/api/ordenes/${op.orderId}`,
    method: "PATCH" as const,
    body: { [field]: (op.payload as TextFieldPayload).value },
  });
}

for (const [field, type] of Object.entries(TEXT_FIELD_OPERATION_TYPES) as [
  WorkOrderTextField,
  string,
][]) {
  registerOperationType(type, buildFieldRequest(field));
}

registerOperationType(STATUS_OPERATION_TYPE, (op) => ({
  url: `/api/ordenes/${op.orderId}`,
  method: "PATCH",
  body: { status: (op.payload as StatusPayload).value },
}));

/**
 * Encola la edición de un campo de texto largo del detalle de la orden.
 * Sin señal, es lo que llaman DescriptionEditor/DiagnosisEditor/
 * ObservationsEditor/SuggestionsEditor en vez de su Server Action de
 * siempre — ver cada uno para el `useOnlineStatus()` que decide cuál de
 * las dos rutas toma.
 */
export function enqueueWorkOrderField(
  orderId: string,
  userId: string,
  field: WorkOrderTextField,
  value: string,
): Promise<PendingOperation> {
  return enqueue({
    type: TEXT_FIELD_OPERATION_TYPES[field],
    orderId,
    payload: { value } satisfies TextFieldPayload,
    userId,
  });
}

/** Encola el cambio de estado — lo llama OrderStatusChanger sin señal. */
export function enqueueWorkOrderStatus(
  orderId: string,
  userId: string,
  status: OrderStatus,
): Promise<PendingOperation> {
  return enqueue({
    type: STATUS_OPERATION_TYPE,
    orderId,
    payload: { value: status } satisfies StatusPayload,
    userId,
  });
}
