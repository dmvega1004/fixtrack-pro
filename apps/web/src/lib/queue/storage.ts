"use client";

import { openDb, QUEUE_STORE as STORE_NAME } from "../sync/db";
import type { EnqueueInput, PendingOperation } from "./types";

/**
 * Capa de persistencia pura de la cola — sin fetch, sin disparar nada.
 * El motor (engine.ts) es quien decide CUÁNDO subir; esto solo guarda,
 * lee y actualiza. La base y la tienda viven en ../sync/db.ts (misma
 * base IndexedDB que el conjunto de trabajo, tienda separada).
 */

/**
 * Inserta una operación nueva. `seq` lo asigna IndexedDB (autoIncrement) —
 * es lo que fija el orden estricto de llegada; el motor recorre la tienda
 * en ese orden y nunca lo reordena.
 */
export async function insertOperation(input: EnqueueInput): Promise<PendingOperation> {
  const db = await openDb();
  try {
    const record: Omit<PendingOperation, "seq"> = {
      id: crypto.randomUUID(),
      type: input.type,
      orderId: input.orderId,
      payload: input.payload,
      userId: input.userId,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
      parked: false,
      ...(input.orderNumber !== undefined ? { orderNumber: input.orderNumber } : {}),
    };

    const seq = await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const request = tx.objectStore(STORE_NAME).add(record);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });

    return { ...record, seq };
  } finally {
    db.close();
  }
}

/**
 * Primera operación NO apartada del usuario dado, en orden estricto de
 * llegada (cursor ascendente por `seq`). null si no hay ninguna pendiente
 * — el motor sube una por vez llamando esto de nuevo tras cada resultado.
 */
export async function getNextOperation(userId: string): Promise<PendingOperation | null> {
  const db = await openDb();
  try {
    return await new Promise<PendingOperation | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(null);
          return;
        }
        const op = cursor.value as PendingOperation;
        if (op.userId === userId && !op.parked) {
          resolve(op);
          return;
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Reemplaza el registro completo (attempts/lastError/parked actualizados) — conserva `seq`, nunca reordena. */
export async function updateOperation(op: PendingOperation): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(op);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Solo tras éxito confirmado (2xx) del servidor — es la única vía que borra una operación de la cola. */
export async function removeOperation(seq: number): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(seq);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Borra una operación APARTADA por decisión explícita del técnico (botón
 * «Descartar» de la pantalla de estado de la cola, con confirmación). Se
 * niega si la operación no está apartada: una pendiente puede estar
 * subiendo en este mismo instante, y borrarla por debajo del motor
 * dejaría la pantalla diciendo algo distinto de lo que llegó al servidor.
 * Devuelve false si no la borró (no existe o no estaba apartada).
 */
export async function discardParkedOperation(seq: number, userId: string): Promise<boolean> {
  const db = await openDb();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      let deleted = false;
      const request = store.get(seq);
      request.onsuccess = () => {
        const op = request.result as PendingOperation | undefined;
        if (op && op.userId === userId && op.parked) {
          store.delete(seq);
          deleted = true;
        }
      };
      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Vuelve a poner en la fila una operación apartada por tope de reintentos
 * (fallo temporal que se alargó, no un rechazo) — en su MISMO lugar: `seq`
 * no cambia, y tampoco `id` (la llave de idempotencia). Se niega si está
 * reemplazada (ver PendingOperation.superseded).
 */
export async function reactivateParkedOperation(seq: number, userId: string): Promise<boolean> {
  const db = await openDb();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      let updated = false;
      const request = store.get(seq);
      request.onsuccess = () => {
        const op = request.result as PendingOperation | undefined;
        if (op && op.userId === userId && op.parked && !op.superseded) {
          store.put({ ...op, parked: false, attempts: 0, lastError: null });
          updated = true;
        }
      };
      tx.oncomplete = () => resolve(updated);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * Tras subir con éxito la operación `succeeded`: marca como reemplazadas
 * las operaciones APARTADAS anteriores (seq menor) del mismo tipo y la
 * misma orden — su valor ya quedó viejo frente al que acaba de llegar al
 * servidor. Sin esto, (1) reactivarla pisaría el valor nuevo y (2) la
 * mezcla de cambios pendientes, que recorre en orden de llegada, volvería
 * a mostrar el valor viejo rechazado apenas se quite la operación nueva.
 */
export async function markSupersededOperations(succeeded: PendingOperation): Promise<number> {
  const db = await openDb();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      let marked = 0;
      const request = store.openCursor(IDBKeyRange.upperBound(succeeded.seq, true));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const op = cursor.value as PendingOperation;
        if (
          op.parked &&
          !op.superseded &&
          op.userId === succeeded.userId &&
          op.orderId === succeeded.orderId &&
          op.type === succeeded.type
        ) {
          cursor.update({ ...op, superseded: true });
          marked += 1;
        }
        cursor.continue();
      };
      tx.oncomplete = () => resolve(marked);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export interface QueueStats {
  pending: number;
  parked: number;
}

/** Conteo para el estado consultable desde React — ver state-store.ts. Filtrado por usuario, como getNextOperation. */
export async function getQueueStats(userId: string): Promise<QueueStats> {
  const db = await openDb();
  try {
    return await new Promise<QueueStats>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).openCursor();
      let pending = 0;
      let parked = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve({ pending, parked });
          return;
        }
        const op = cursor.value as PendingOperation;
        if (op.userId === userId) {
          if (op.parked) parked += 1;
          else pending += 1;
        }
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Vuelco completo de la cola de un usuario, en orden de llegada — lo usan la mezcla de cambios pendientes y la pantalla de estado. */
export async function listOperations(userId: string): Promise<PendingOperation[]> {
  return (await listAllOperations()).filter((op) => op.userId === userId);
}

/**
 * TODAS las operaciones, de cualquier usuario, en orden de llegada. Solo
 * para contar las de otros usuarios (aviso de celular compartido) — su
 * contenido nunca se muestra.
 */
export async function listAllOperations(): Promise<PendingOperation[]> {
  const db = await openDb();
  try {
    return await new Promise<PendingOperation[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).openCursor();
      const result: PendingOperation[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(result);
          return;
        }
        result.push(cursor.value as PendingOperation);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
