"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { toFriendlyActionMessage } from "@/lib/api/http";
import type { OrderStatus } from "@/components/shared/status-chip";
import type { Priority } from "@/components/shared/priority-badge";
import type { ServiceType } from "@/components/shared/service-type-badge";
import type { PaymentMethod } from "@/lib/api/payments";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Los 401 ya los resuelve serverFetch (redirect a /login). Acá solo nos
 * interesa convertir los 4xx de negocio (403 RBAC, 409 estado terminal o
 * stock insuficiente, 404) en un resultado que el cliente pueda mostrar
 * como toast, en vez de reventar la Server Action.
 */
async function runMutation(
  orderId: string,
  fn: () => Promise<unknown>,
): Promise<ActionResult> {
  try {
    await fn();
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }

  revalidatePath(`/ordenes/${orderId}`);
  return { ok: true };
}

export async function changeStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { status },
    }),
  );
}

export async function saveDescriptionAction(
  orderId: string,
  description: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { description },
    }),
  );
}

export async function saveDiagnosisAction(
  orderId: string,
  diagnosis: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { diagnosis },
    }),
  );
}

export async function saveObservationsAction(
  orderId: string,
  observations: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { observations },
    }),
  );
}

export async function saveSuggestionsAction(
  orderId: string,
  suggestions: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { suggestions },
    }),
  );
}

/**
 * Cliente final, ciudad y hora del servicio se guardan juntos en un solo
 * PATCH — un bloque, un botón de guardar (ver ServiceLocationEditor).
 */
export async function saveServiceLocationAction(
  orderId: string,
  input: { endClientName: string; serviceCity: string; serviceTime: string },
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: input,
    }),
  );
}

export async function reassignTechnicianAction(
  orderId: string,
  userId: string | null,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { userId },
    }),
  );
}

/**
 * PATCH /work-orders/:id con equipmentIds — reemplaza el set COMPLETO de
 * equipos de la orden (no es un delta), así que el llamador siempre debe
 * mandar la lista final resultante (tras agregar o quitar uno).
 */
export async function updateOrderEquipmentsAction(
  orderId: string,
  equipmentIds: string[],
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { equipmentIds },
    }),
  );
}

export async function changePriorityAction(
  orderId: string,
  priority: Priority,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { priority },
    }),
  );
}

/** El backend rechaza este cambio si lo intenta un TECHNICIAN (403). */
export async function changeServiceTypeAction(
  orderId: string,
  serviceType: ServiceType,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { serviceType },
    }),
  );
}

export interface SaveBillingInput {
  laborAmount: number;
  additionalAmount: number;
  additionalDescription: string;
  discountAmount: number;
}

export async function saveBillingAction(
  orderId: string,
  dto: SaveBillingInput,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: {
        laborAmount: dto.laborAmount,
        additionalAmount: dto.additionalAmount,
        additionalDescription: dto.additionalDescription,
        discountAmount: dto.discountAmount,
      },
    }),
  );
}

export interface WorkOrderConceptInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

/**
 * PATCH /work-orders/:id con `items` — reemplaza el set COMPLETO de
 * conceptos de la orden (no es un delta, mismo criterio que
 * updateOrderEquipmentsAction). Funciona tanto con la orden abierta como
 * ya cerrada (ver isBillingOnlyEdit en el backend): en ambos casos el
 * backend recalcula el total, con el IVA congelado si ya estaba cerrada.
 */
export async function saveConceptsAction(
  orderId: string,
  items: WorkOrderConceptInput[],
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { items },
    }),
  );
}

/**
 * PATCH /work-orders/:id con SOLO billedAt — corrige la fecha de
 * facturación de una orden ya facturada (ADMIN, ver RBAC en el service).
 * A diferencia de saveBillingAction, no se combina con laborAmount/
 * additionalAmount/discountAmount: el backend exige que billedAt viaje
 * solo para poder editarlo incluso en órdenes DELIVERED (selladas).
 */
export async function saveBilledAtAction(
  orderId: string,
  billedAt: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { billedAt },
    }),
  );
}

/**
 * PATCH /work-orders/:id con `retentionIds` — reemplaza el set COMPLETO de
 * retenciones aplicadas (no es un delta, mismo criterio que
 * saveConceptsAction). Funciona tanto con la orden abierta como ya
 * cerrada (ver isBillingOnlyEdit en el backend): en ambos casos el
 * backend recalcula el desglose y netAmount. SOLO ADMIN (403 del backend
 * para el resto).
 */
export async function saveRetentionsAction(
  orderId: string,
  retentionIds: string[],
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: { retentionIds },
    }),
  );
}

export interface SaveDirectCostInput {
  directCostAmount: number;
  directCostDescription: string;
}

/**
 * PATCH /work-orders/:id con SOLO directCostAmount/directCostDescription —
 * "Costos internos" (pestaña «Valores», solo ADMIN, ver RBAC en el
 * service). Igual que saveBilledAtAction: se envían solos para poder
 * editarlos incluso en órdenes ya cerradas (DELIVERED/CANCELLED) — la
 * factura del proveedor suele llegar días después de entregado el trabajo.
 */
export async function saveDirectCostAction(
  orderId: string,
  dto: SaveDirectCostInput,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}`, {
      method: "PATCH",
      body: {
        directCostAmount: dto.directCostAmount,
        directCostDescription: dto.directCostDescription,
      },
    }),
  );
}

export async function addPartAction(
  orderId: string,
  sparePartId: string,
  quantity: number,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}/parts`, {
      method: "POST",
      body: { sparePartId, quantity },
    }),
  );
}

export async function removePartAction(
  orderId: string,
  sparePartId: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}/parts/${sparePartId}`, {
      method: "DELETE",
    }),
  );
}

export interface CreatePaymentInput {
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export async function createPaymentAction(
  orderId: string,
  dto: CreatePaymentInput,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}/payments`, {
      method: "POST",
      body: dto,
    }),
  );
}

export async function deletePaymentAction(
  orderId: string,
  paymentId: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/payments/${paymentId}`, {
      method: "DELETE",
    }),
  );
}

export async function removePhotoAction(
  orderId: string,
  photoId: string,
): Promise<ActionResult> {
  return runMutation(orderId, () =>
    serverFetch(`/work-orders/${orderId}/photos/${photoId}`, {
      method: "DELETE",
    }),
  );
}

export interface GenerateCollectionDocumentResult extends ActionResult {
  collectionNumber?: number;
}

/**
 * POST /work-orders/:id/collection-document — SOLO ADMIN. 409 si la orden
 * no está cerrada; idempotente si ya tiene número. Devuelve el número
 * asignado para que el botón navegue directo al documento.
 */
export async function generateCollectionDocumentAction(
  orderId: string,
): Promise<GenerateCollectionDocumentResult> {
  try {
    const order = await serverFetch<{ collectionNumber: number | null }>(
      `/work-orders/${orderId}/collection-document`,
      { method: "POST" },
    );
    revalidatePath(`/ordenes/${orderId}`);
    return { ok: true, collectionNumber: order.collectionNumber ?? undefined };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/**
 * DELETE /work-orders/:id — SOLO ADMIN (RBAC en el backend). No usa
 * runMutation porque tras borrar la orden ya no existe nada que revalidar
 * en /ordenes/:id: el llamador redirige a /ordenes.
 */
export async function deleteWorkOrderAction(orderId: string): Promise<ActionResult> {
  try {
    await serverFetch(`/work-orders/${orderId}`, { method: "DELETE" });
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }

  revalidatePath("/ordenes");
  return { ok: true };
}
