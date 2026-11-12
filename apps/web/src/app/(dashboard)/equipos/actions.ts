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
import {
  deleteEquipmentPhoto,
  setEquipmentCoverFromOrderPhoto,
  setEquipmentCoverPhoto,
} from "@/lib/api/equipment-photos";

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

export interface EquipmentCoverActionResult {
  ok: boolean;
  message?: string;
  /** Portada resultante (al borrar la portada, pasa a la más reciente o a null). */
  coverPhotoId?: string | null;
}

/** PATCH /equipments/:id/photos/:photoId/cover — los tres roles. */
export async function setEquipmentCoverPhotoAction(
  equipmentId: string,
  photoId: string,
): Promise<EquipmentCoverActionResult> {
  try {
    const { coverPhotoId } = await setEquipmentCoverPhoto(equipmentId, photoId);
    revalidatePath(`/equipos/${equipmentId}`);
    return { ok: true, coverPhotoId };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/** DELETE /equipments/:id/photos/:photoId — solo ADMIN/COORDINATOR (RBAC en el backend). */
export async function deleteEquipmentPhotoAction(
  equipmentId: string,
  photoId: string,
): Promise<EquipmentCoverActionResult> {
  try {
    const { coverPhotoId } = await deleteEquipmentPhoto(equipmentId, photoId);
    revalidatePath(`/equipos/${equipmentId}`);
    return { ok: true, coverPhotoId };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}

/**
 * «Usar como portada del equipo» desde la pestaña Fotos de la orden. El
 * backend copia la foto en Cloudinary (recurso independiente) y la deja
 * como portada; si ya se había copiado a ese equipo, solo la marca.
 */
export async function setEquipmentCoverFromOrderPhotoAction(
  equipmentId: string,
  attachmentId: string,
): Promise<EquipmentActionResult> {
  try {
    await setEquipmentCoverFromOrderPhoto(equipmentId, attachmentId);
    revalidatePath("/equipos");
    revalidatePath(`/equipos/${equipmentId}`);
    return { ok: true };
  } catch (error) {
    const message = toFriendlyActionMessage(error);
    if (message) {
      return { ok: false, message };
    }
    throw error;
  }
}
