/**
 * Sube cuando cambie la forma de SyncPayload (ver types.ts). Es un valor
 * en tiempo de ejecución (no un tipo) usado tanto por el route handler
 * (servidor) como por el motor de sincronización (cliente) — vive en su
 * propio módulo sin ninguna dependencia server-only para poder
 * importarse tal cual, sin `type`, desde cualquiera de los dos lados.
 */
export const SYNC_PAYLOAD_VERSION = 1;
