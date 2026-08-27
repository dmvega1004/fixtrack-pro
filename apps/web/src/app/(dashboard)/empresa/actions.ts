"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { toFriendlyActionMessage } from "@/lib/api/http";
import type { UpdateCompanyInput } from "@/lib/api/company";

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
