"use server";

import { revalidatePath } from "next/cache";
import { toFriendlyActionMessage } from "@/lib/api/http";
import {
  createSparePart,
  updateSparePart,
  deleteSparePart,
  type CreateSparePartInput,
  type UpdateSparePartInput,
} from "@/lib/api/spare-parts";

export interface SparePartActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

export async function createSparePartAction(
  dto: CreateSparePartInput,
): Promise<SparePartActionResult> {
  try {
    const part = await createSparePart(dto);
    revalidatePath("/inventario");
    return { ok: true, id: part.id };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

export async function updateSparePartAction(
  id: string,
  dto: UpdateSparePartInput,
): Promise<SparePartActionResult> {
  try {
    await updateSparePart(id, dto);
    revalidatePath("/inventario");
    revalidatePath(`/inventario/${id}/editar`);
    return { ok: true, id };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

export async function deleteSparePartAction(
  id: string,
): Promise<SparePartActionResult> {
  try {
    await deleteSparePart(id);
    revalidatePath("/inventario");
    return { ok: true };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}
