"use client";

/**
 * Dueño único de la base IndexedDB "fixtrack-sync": el conjunto de trabajo
 * (storage.ts, Etapa 1-C-1) y la cola de cambios pendientes
 * (../queue/storage.ts, Etapa 2-B) viven en la MISMA base pero en tiendas
 * separadas — tienen ciclos de vida distintos (el conjunto de trabajo se
 * reemplaza entero en cada sincronización; la cola crece y se vacía
 * operación por operación) y cada módulo solo toca la suya. Centralizar
 * la apertura acá evita que dos módulos abran la misma base con distinta
 * DB_VERSION — IndexedDB tira VersionError si alguien pide una versión
 * menor a la ya existente.
 */
const DB_NAME = "fixtrack-sync";
const DB_VERSION = 2;

export const WORKSET_STORE = "workset";
/** keyPath "seq", autoincremental: define el orden estricto de llegada que respeta el motor de la cola. */
export const QUEUE_STORE = "pending-operations";

export function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(WORKSET_STORE)) {
        db.createObjectStore(WORKSET_STORE);
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "seq", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
