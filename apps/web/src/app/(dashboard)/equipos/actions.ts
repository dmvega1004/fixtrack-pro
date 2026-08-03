"use server";

import { revalidatePath } from "next/cache";
import { HttpError } from "@/lib/api/http";
import {
  createEquipment,
  updateEquipment,
  type CreateEquipmentInput,
  type UpdateEquipmentInput,
} from "@/lib/api/equipments";

export interface EquipmentActionResult {
  ok: boolean;
  message?: string;
  id?: string;
}

export async function createEquipmentAction(
  dto: CreateEquipmentInput,
): Promise<EquipmentActionResult> {
  try {
    const equipment = await createEquipment(dto);
    revalidatePath("/equipos");
    return { ok: true, id: equipment.id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}

export async function updateEquipmentAction(
  id: string,
  dto: UpdateEquipmentInput,
): Promise<EquipmentActionResult> {
  try {
    await updateEquipment(id, dto);
    revalidatePath("/equipos");
    revalidatePath(`/equipos/${id}`);
    revalidatePath(`/equipos/${id}/editar`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof HttpError) {
      return { ok: false, message: error.message };
    }
    throw error;
  }
}
