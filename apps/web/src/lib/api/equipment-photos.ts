import { serverFetch } from "./server-fetch";

// Debe reflejar el modelo EquipmentPhoto de packages/database/prisma/schema.prisma
// más `isCover`, que el backend calcula contra Equipment.coverPhotoId.
export interface EquipmentPhoto {
  id: string;
  url: string;
  publicId: string;
  equipmentId: string;
  companyId: string;
  uploadedById: string | null;
  createdAt: string;
  isCover: boolean;
}

/** GET /equipments/:id/photos — más reciente primero. */
export function getEquipmentPhotos(equipmentId: string): Promise<EquipmentPhoto[]> {
  return serverFetch<EquipmentPhoto[]>(`/equipments/${equipmentId}/photos`);
}

/** PATCH /equipments/:id/photos/:photoId/cover — los tres roles. */
export function setEquipmentCoverPhoto(
  equipmentId: string,
  photoId: string,
): Promise<{ coverPhotoId: string | null }> {
  return serverFetch(`/equipments/${equipmentId}/photos/${photoId}/cover`, {
    method: "PATCH",
  });
}

/** DELETE /equipments/:id/photos/:photoId — solo ADMIN/COORDINATOR. Devuelve la portada resultante. */
export function deleteEquipmentPhoto(
  equipmentId: string,
  photoId: string,
): Promise<{ coverPhotoId: string | null }> {
  return serverFetch(`/equipments/${equipmentId}/photos/${photoId}`, {
    method: "DELETE",
  });
}

/**
 * POST /equipments/:id/photos/from-order-photo — copia una foto de una
 * orden donde está el equipo y la deja como portada (los tres roles).
 */
export function setEquipmentCoverFromOrderPhoto(
  equipmentId: string,
  attachmentId: string,
): Promise<EquipmentPhoto> {
  return serverFetch<EquipmentPhoto>(
    `/equipments/${equipmentId}/photos/from-order-photo`,
    { method: "POST", body: { attachmentId } },
  );
}
