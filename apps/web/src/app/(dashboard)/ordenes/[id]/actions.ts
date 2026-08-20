"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { HttpError } from "@/lib/api/http";
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
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
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
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
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
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidatePath("/ordenes");
  return { ok: true };
}
