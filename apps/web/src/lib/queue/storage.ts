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

/** Vuelco completo de la cola de un usuario, en orden de llegada — solo para inspección/depuración (ver ./debug.ts). */
export async function listOperations(userId: string): Promise<PendingOperation[]> {
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
        const op = cursor.value as PendingOperation;
        if (op.userId === userId) result.push(op);
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
