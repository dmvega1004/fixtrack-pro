"use client";

import type { SyncPayload } from "./types";
import { openDb, WORKSET_STORE as STORE_NAME } from "./db";

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
