/**
 * Forma de una operación encolada — no tiene ningún export en tiempo de
 * ejecución, seguro de importar con `import type` desde cualquier lado.
 */
export interface PendingOperation {
  /**
   * Clave interna de IndexedDB (autoincremental) — NO viaja al backend.
   * Es lo único que garantiza el orden estricto de llegada que respeta
   * el motor (storage.ts la asigna al encolar y nunca cambia).
   */
  seq: number;
  /**
   * Identificador único generado al encolar. ES la llave de
   * Idempotency-Key que viaja en la cabecera en TODOS los reintentos —
   * la misma siempre, esa es la costura con la Etapa 2-A (ver
   * packages/backend/src/idempotency).
   */
  id: string;
  /** Tipo de operación — lo definen los productores reales en la Etapa 2-C (ej. "workorder.diagnostico"). */
  type: string;
  /** A qué orden pertenece. */
  orderId: string;
  /** Datos de la operación — forma libre, la decide cada tipo. */
  payload: unknown;
  /** Dueño — el motor SOLO sube (y solo cuenta) operaciones del usuario autenticado actual. */
  userId: string;
  enqueuedAt: string;
  /** Cuántas veces se intentó subir. NO cuenta los 409 de idempotencia (ver engine.ts) — esos no son un fallo. */
  attempts: number;
  /** Motivo del último intento no exitoso, o null si nunca falló. */
  lastError: string | null;
  /** true = fallo permanente (400/403/404) o tope de reintentos alcanzado. Se conserva, no se borra, el motor la salta. */
  parked: boolean;
  /**
   * Número de la OT, SOLO para mostrarla en la pantalla de estado de la
   * cola — ningún builder lo lee, nunca viaja al servidor. Hace falta
   * guardarlo acá porque el conjunto de trabajo solo trae órdenes no
   * terminales: una orden que se entregó mientras la operación esperaba
   * (justo el caso del rechazo) desaparece del celular en el próximo sync.
   * Opcional: las operaciones encoladas antes de que existiera no lo traen.
   */
  orderNumber?: number;
  /**
   * Solo en operaciones apartadas: un cambio POSTERIOR del mismo campo de
   * la misma orden ya subió con éxito (ver markSupersededOperations).
   * Reactivarla pisaría ese valor más nuevo — la pantalla solo ofrece
   * copiar o descartar, y la mezcla de cambios pendientes la ignora.
   */
  superseded?: boolean;
}

/** Lo que arma cada tipo de operación registrado para poder subirse — ver registry.ts. */
export interface OperationRequest {
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

export type OperationRequestBuilder = (op: PendingOperation) => OperationRequest;

export interface EnqueueInput {
  type: string;
  orderId: string;
  payload: unknown;
  userId: string;
  /** Solo pantalla — ver PendingOperation.orderNumber. */
  orderNumber?: number;
}
