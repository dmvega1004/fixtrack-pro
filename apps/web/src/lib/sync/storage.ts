"use client";

import type { SyncPayload, SyncWorkOrder } from "./types";
import { openDb, WORKSET_STORE as STORE_NAME } from "./db";
import { getSnapshot, setSyncState } from "./state-store";

/**
 * IndexedDB, no localStorage: el conjunto de trabajo trae fotos (URLs) y
 * repuestos anidados por cada orden — puede superar sin esfuerzo los ~5MB
 * típicos de localStorage, y su API es síncrona (bloquea el hilo principal
 * al leer/escribir un JSON grande). Una sola entrada de tamaño variable,
 * se reemplaza entera en cada sincronización — no hay merge por orden.
 *
 * La apertura de la base vive en ./db.ts — compartida con la cola de
 * cambios pendientes (../queue/storage.ts, Etapa 2-B), misma base,
 * tienda separada.
 */
/** Única clave usada: siempre hay a lo sumo un registro en todo el store. */
const RECORD_KEY = "current";

export interface StoredWorkset {
  /** Dueño de este payload — se compara contra el usuario autenticado al arrancar (ver engine.ts). */
  userId: string;
  syncedAt: string;
  payloadVersion: number;
  payload: SyncPayload;
}

export async function saveWorkset(record: StoredWorkset): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadWorkset(): Promise<StoredWorkset | null> {
  const db = await openDb();
  try {
    const record = await new Promise<StoredWorkset | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => resolve(request.result as StoredWorkset | undefined);
      request.onerror = () => reject(request.error);
    });
    return record ?? null;
  } finally {
    db.close();
  }
}

/**
 * Aplica, de una vez, el efecto de una escritura que el servidor ACABA de
 * confirmar (200 en la subida de la cola, ver lib/queue/engine.ts) sobre
 * el conjunto de trabajo guardado — en memoria (setSyncState) y en
 * IndexedDB (saveWorkset).
 *
 * Sin esto queda un hueco real: la cola quita la operación de su lista
 * apenas sube (retira el parche pendiente, ver lib/queue/pending-changes.ts)
 * pero el conjunto de trabajo recién se refresca con el próximo ciclo de
 * sincronización REAL (evento "online", cada 5 minutos, o al recargar) —
 * en el medio, useSyncedOrder volvería a mostrar, por un instante, el
 * valor de ANTES de la escritura. Esto cierra ese hueco de inmediato con
 * el mismo valor que el servidor acaba de confirmar; el próximo sync real
 * de todas formas sobreescribe esto con la verdad completa, así que no
 * hace falta que sea perfecto — solo que no haya un instante en blanco.
 *
 * No hace nada si el conjunto de trabajo todavía no cargó (`workset` null)
 * — no hay ningún valor viejo que corregir todavía, el próximo sync real
 * ya trae la orden completa y actualizada.
 */
export async function applyConfirmedWorksetUpdate(
  orderId: string,
  patch: Partial<SyncWorkOrder>,
): Promise<void> {
  const { workset } = getSnapshot();
  if (!workset) return;

  const orders = workset.orders.map((order) =>
    order.id === orderId ? { ...order, ...patch } : order,
  );
  const updatedWorkset: SyncPayload = { ...workset, orders };
  setSyncState({ workset: updatedWorkset });

  const stored = await loadWorkset();
  if (stored) {
    await saveWorkset({ ...stored, payload: updatedWorkset });
  }
}

/** Vacía el almacén — mismo destino tanto para "otro usuario" como para "versión vieja" como para logout. */
export async function clearWorkset(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
