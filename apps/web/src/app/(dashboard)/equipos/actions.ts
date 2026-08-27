"use server";

import { revalidatePath } from "next/cache";
import { toFriendlyActionMessage } from "@/lib/api/http";
import {
  createEquipment,
  updateEquipment,
  deleteEquipment,
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
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
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
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/** DELETE /equipments/:id — solo ADMIN (RBAC en el backend). 409 si tiene órdenes asociadas. */
export async function deleteEquipmentAction(id: string): Promise<EquipmentActionResult> {
  try {
    await deleteEquipment(id);
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }

  revalidatePath("/equipos");
  return { ok: true };
}
