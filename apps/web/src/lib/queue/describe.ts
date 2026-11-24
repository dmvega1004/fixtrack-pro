import { ORDER_STATUS_LABELS, type OrderStatus } from "@/components/shared/status-chip";
import { FIELD_BY_OPERATION_TYPE, type WorkOrderQueuedField } from "./field-operations";
import type { PendingOperation } from "./types";

/**
 * Cómo se le muestra al técnico cada operación de la cola — pantalla de
 * estado (components/queue). Sin runtime de IndexedDB ni del motor: solo
 * traduce lo que ya está guardado en la operación.
 */

const FIELD_LABELS: Record<WorkOrderQueuedField, string> = {
  description: "Descripción",
  diagnosis: "Diagnóstico",
  observations: "Observaciones",
  suggestions: "Recomendaciones",
  status: "Estado",
};

export function describeField(op: PendingOperation): string {
  const field = FIELD_BY_OPERATION_TYPE[op.type];
  if (field) return FIELD_LABELS[field];
  if (op.type === "debug.prueba") return "Prueba (solo desarrollo)";
  return op.type;
}

/** Texto completo tal como el técnico lo dejó — lo que se copia al portapapeles. */
export function operationValue(op: PendingOperation): string {
  const value = (op.payload as { value?: unknown } | null)?.value;
  if (FIELD_BY_OPERATION_TYPE[op.type] === "status" && typeof value === "string") {
    return ORDER_STATUS_LABELS[value as OrderStatus] ?? value;
  }
  if (typeof value === "string") return value;
  return JSON.stringify(op.payload);
}

const FRAGMENT_LENGTH = 80;

export function operationFragment(op: PendingOperation): string {
  const value = operationValue(op).replace(/\s+/g, " ").trim();
  if (value === "") return "(vacío)";
  return value.length > FRAGMENT_LENGTH ? `${value.slice(0, FRAGMENT_LENGTH).trimEnd()}…` : value;
}

/**
 * - `rejected`: el servidor dijo que no (400/403/404/409 de negocio) —
 *   ningún reintento lo arregla. Copiar y descartar.
 * - `exhausted`: fallo temporal (red/5xx) que llegó al tope de reintentos
 *   — se puede volver a intentar.
 * - `superseded`: un cambio posterior del mismo campo ya subió.
 * - `internal`: la app no sabe subir este tipo — error nuestro.
 */
export type ParkKind = "rejected" | "exhausted" | "superseded" | "internal";

export interface ParkReason {
  kind: ParkKind;
  /** En palabras de técnico, nunca un código HTTP. */
  message: string;
}

/**
 * Deriva el motivo del texto de `lastError` que escribe engine.ts
 * ("http-409: …", "network (tope de 10 intentos)", "sin manejador…") —
 * funciona igual para operaciones apartadas antes de que existiera esta
 * pantalla, sin migrar nada.
 */
export function describeParkReason(op: PendingOperation): ParkReason {
  if (op.superseded) {
    return {
      kind: "superseded",
      message: "Un cambio posterior de este mismo campo ya llegó al servidor. Este quedó viejo.",
    };
  }

  const error = op.lastError ?? "";

  if (error.includes("(tope de")) {
    return {
      kind: "exhausted",
      message: "No se pudo subir después de varios intentos (sin señal o el servidor no respondió).",
    };
  }

  if (error.startsWith("sin manejador")) {
    return {
      kind: "internal",
      message: "La app no sabe subir este tipo de cambio. Copia el texto y avisa a soporte.",
    };
  }

  const match = /^http-(\d{3}):\s*([\s\S]*)$/.exec(error);
  const status = match ? Number(match[1]) : null;
  const serverMessage = match?.[2] ?? error;

  if (status === 409) {
    if (/DELIVERED/.test(serverMessage)) {
      return { kind: "rejected", message: "La orden ya fue entregada y no admite cambios." };
    }
    if (/CANCELLED/.test(serverMessage)) {
      return { kind: "rejected", message: "La orden fue cancelada y no admite cambios." };
    }
    return { kind: "rejected", message: `El servidor no aceptó el cambio: ${serverMessage}` };
  }

  if (status === 404) {
    return {
      kind: "rejected",
      message: "La orden ya no está asignada a ti o fue eliminada.",
    };
  }

  if (status === 403) {
    return { kind: "rejected", message: "Tu usuario no tiene permiso para hacer este cambio." };
  }

  if (status === 400) {
    if (serverMessage.includes("[FALTA")) {
      return {
        kind: "rejected",
        message: "El texto todavía tiene marcas [FALTA: …] sin completar.",
      };
    }
    if (/descripción no puede quedar vacía/i.test(serverMessage)) {
      return { kind: "rejected", message: "La descripción no puede quedar vacía." };
    }
    return { kind: "rejected", message: `El servidor no aceptó el cambio: ${serverMessage}` };
  }

  return {
    kind: "rejected",
    message: serverMessage ? `El servidor no aceptó el cambio: ${serverMessage}` : "El servidor no aceptó el cambio.",
  };
}

/** Motivo del último intento fallido de una operación que SIGUE en la fila (no apartada). */
export function describeWaitingReason(op: PendingOperation): string | null {
  if (!op.lastError) return null;
  if (op.lastError === "network") return "Sin señal en el último intento";
  if (op.lastError.startsWith("http-5")) return "El servidor no respondió bien en el último intento";
  return "El último intento falló";
}
