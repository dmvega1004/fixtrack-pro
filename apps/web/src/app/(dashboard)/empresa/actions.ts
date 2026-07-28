"use server";

import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server-fetch";
import { HttpError } from "@/lib/api/http";
import type { UpdateCompanyInput } from "@/lib/api/company";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function saveCompanyAction(
  dto: UpdateCompanyInput,
): Promise<ActionResult> {
  try {
    await serverFetch("/company/me", { method: "PATCH", body: dto });
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }

  revalidatePath("/empresa");
  return { ok: true };
}
