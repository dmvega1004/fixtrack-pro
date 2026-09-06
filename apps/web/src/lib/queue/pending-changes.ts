"use client";

import type { SyncWorkOrder } from "../sync/types";
import { FIELD_BY_OPERATION_TYPE, type WorkOrderQueuedField } from "./field-operations";
import { listOperations } from "./storage";

/**
 * La mezcla "conjunto de trabajo + cambios pendientes encima" (ver
 * hooks/use-synced-order.ts, que es quien la aplica) vive ACÁ — en la
 * cola, no en ../sync — porque es la cola la que sabe qué campos tiene
 * pendientes cada orden y en qué orden llegaron. ../sync solo conoce el
 * conjunto de trabajo que bajó del servidor; nunca sabe de operaciones
 * encoladas, y no debería tener que enterarse.
 *
 * Deliberadamente derivado ENTERO desde la cola persistida (listOperations)
 * cada vez que la cola cambia, en vez de mantenerse incremental
 * (agregar en enqueue, restar en removeOperation): con incrementales, subir
 * la operación #1 de un campo mientras la #2 del MISMO campo sigue
 * pendiente podría borrar por error el valor de la #2 al llegarle su turno
 * de limpieza. Recalcular del origen (la tabla completa) no tiene esa
 * clase de bug, y el volumen (algunas decenas de operaciones como mucho)
 * hace que el costo sea irrelevante.
 *
 * Incluye operaciones APARTADAS (parked) a propósito: un fallo permanente
 * de subida no invalida lo que el técnico escribió en el celular — sigue
 * siendo la única copia de ese cambio hasta que exista una pantalla de
 * estado de la cola (entrega de cierre) donde pueda revisarlo.
 */
export type PendingWorkOrderPatch = Partial<
  Pick<SyncWorkOrder, WorkOrderQueuedField>
>;

type Listener = () => void;

let patches = new Map<string, PendingWorkOrderPatch>();
const listeners = new Set<Listener>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ReadonlyMap<string, PendingWorkOrderPatch> {
  return patches;
}

export function getServerSnapshot(): ReadonlyMap<string, PendingWorkOrderPatch> {
  return patches;
}

/**
 * Recorre TODAS las operaciones del usuario (en orden estricto de
 * llegada, ver storage.listOperations) y arma, por orden, el parche de los
 * campos que tienen algo pendiente — la última operación de cada campo
 * gana, que es exactamente el orden en que se subirán. Se llama junto con
 * refreshStats en engine.ts: cualquier cambio en la cola (encolar, subir,
 * apartar) recalcula esta mezcla.
 */
export async function refreshPendingChanges(userId: string): Promise<void> {
  const ops = await listOperations(userId);
  const next = new Map<string, PendingWorkOrderPatch>();

  for (const op of ops) {
    const field = FIELD_BY_OPERATION_TYPE[op.type];
    if (!field) continue; // otros tipos (fotos, firma... entregas futuras) no aportan a esta mezcla

    const value = (op.payload as { value: unknown }).value;
    const existing = next.get(op.orderId) ?? {};
    next.set(op.orderId, { ...existing, [field]: value });
  }

  patches = next;
  notify();
}
