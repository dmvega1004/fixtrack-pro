"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { toFriendlyActionMessage } from "@/lib/api/http";
import type { UpdateCompanyInput } from "@/lib/api/company";
import {
  createRetention,
  reorderRetentions,
  updateRetention,
  type CreateRetentionInput,
  type Retention,
  type UpdateRetentionInput,
} from "@/lib/api/retentions";

export interface ActionResult {
  ok: boolean;
  message?: string;
  /** Advertencia no bloqueante (ej. nextCollectionNumber en riesgo de duplicar). */
  warning?: string;
}

export async function saveCompanyAction(
  dto: UpdateCompanyInput,
): Promise<ActionResult> {
  try {
    const result = await serverFetch<{ collectionNumberWarning?: string }>(
      "/company/me",
      { method: "PATCH", body: dto },
    );
    revalidatePath("/empresa");
    return { ok: true, warning: result.collectionNumberWarning };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

export interface RetentionActionResult {
  ok: boolean;
  message?: string;
  retention?: Retention;
}

/** Catálogo de retenciones ("Mi empresa" → tarjeta "Retenciones"). Solo ADMIN (403 del backend para el resto). */
export async function createRetentionAction(
  dto: CreateRetentionInput,
): Promise<RetentionActionResult> {
  try {
    const retention = await createRetention(dto);
    revalidatePath("/empresa");
    return { ok: true, retention };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) return { ok: false, message };
    throw error;
  }
}

export async function updateRetentionAction(
  id: string,
  dto: UpdateRetentionInput,
): Promise<RetentionActionResult> {
  try {
    const retention = await updateRetention(id, dto);
    revalidatePath("/empresa");
    return { ok: true, retention };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) return { ok: false, message };
    throw error;
  }
}

export interface ReorderRetentionsResult {
  ok: boolean;
  message?: string;
  retentions?: Retention[];
}

export async function reorderRetentionsAction(
  ids: string[],
): Promise<ReorderRetentionsResult> {
  try {
    const retentions = await reorderRetentions(ids);
    revalidatePath("/empresa");
    return { ok: true, retentions };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) return { ok: false, message };
    throw error;
  }
}
