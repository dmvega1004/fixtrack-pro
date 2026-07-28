"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { HttpError } from "@/lib/api/http";
import type { OrderStatus } from "@/components/shared/status-chip";
import type { Priority } from "@/components/shared/priority-badge";

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
