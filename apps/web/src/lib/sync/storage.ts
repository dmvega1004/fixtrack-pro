"use client";

import type { SyncPayload } from "./types";

/**
 * IndexedDB, no localStorage: el conjunto de trabajo trae fotos (URLs) y
 * repuestos anidados por cada orden — puede superar sin esfuerzo los ~5MB
 * típicos de localStorage, y su API es síncrona (bloquea el hilo principal
 * al leer/escribir un JSON grande). Una sola entrada de tamaño variable,
 * se reemplaza entera en cada sincronización — no hay merge por orden.
 */
const DB_NAME = "fixtrack-sync";
const DB_VERSION = 1;
const STORE_NAME = "workset";
/** Única clave usada: siempre hay a lo sumo un registro en todo el store. */
const RECORD_KEY = "current";

export interface StoredWorkset {
  /** Dueño de este payload — se compara contra el usuario autenticado al arrancar (ver engine.ts). */
  userId: string;
  syncedAt: string;
  payloadVersion: number;
  payload: SyncPayload;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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
