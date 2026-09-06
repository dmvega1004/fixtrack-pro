import type { OrderStatus } from "@/components/shared/status-chip";

/**
 * Qué campo de la orden mueve cada tipo de operación registrado por
 * producers.ts — sin runtime en ./engine.ts ni en ./producers.ts a
 * propósito: pending-changes.ts (la mezcla de lectura, ver ese archivo)
 * necesita este mapa y NO puede importar producers.ts sin crear un ciclo
 * (producers.ts → engine.ts → pending-changes.ts → producers.ts).
 */
export type WorkOrderTextField =
  | "description"
  | "diagnosis"
  | "observations"
  | "suggestions";

export const TEXT_FIELD_OPERATION_TYPES: Record<WorkOrderTextField, string> = {
  description: "workorder.descripcion",
  diagnosis: "workorder.diagnostico",
  observations: "workorder.observaciones",
  suggestions: "workorder.recomendaciones",
};

export const STATUS_OPERATION_TYPE = "workorder.estado";

export type WorkOrderQueuedField = WorkOrderTextField | "status";

/** Tipo de operación → campo que sobrescribe. Inverso de TEXT_FIELD_OPERATION_TYPES + STATUS_OPERATION_TYPE. */
export const FIELD_BY_OPERATION_TYPE: Record<string, WorkOrderQueuedField> = {
  ...(Object.fromEntries(
    Object.entries(TEXT_FIELD_OPERATION_TYPES).map(([field, type]) => [type, field]),
  ) as Record<string, WorkOrderTextField>),
  [STATUS_OPERATION_TYPE]: "status",
};

export interface TextFieldPayload {
  value: string;
}

export interface StatusPayload {
  value: OrderStatus;
}
