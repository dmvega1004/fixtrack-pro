"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Star, WifiOff } from "lucide-react";
import { PhotoGallery } from "@/components/shared/photo-gallery";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { EquipmentPhoto } from "@/lib/api/equipment-photos";
import { MAX_PHOTOS_PER_EQUIPMENT } from "@/lib/equipment-photos";
import {
  deleteEquipmentPhotoAction,
  setEquipmentCoverPhotoAction,
} from "@/app/(dashboard)/equipos/actions";

interface EquipmentPhotosSectionProps {
  equipmentId: string;
  initialPhotos: EquipmentPhoto[];
  /** ADMIN y COORDINATOR. Subir y marcar portada lo pueden los tres roles. */
  canDelete: boolean;
}

/**
 * Galería de identificación del equipo, con una foto marcada como portada
 * (la que se muestra junto a marca y modelo en el encabezado). Reusa
 * PhotoGallery, el mismo núcleo de la pestaña Fotos de la orden.
 *
 * Sin señal no se intenta: las fotos no pasan por la cola de pendientes,
 * así que subir y marcar portada quedan desactivados con el motivo a la
 * vista (mismo criterio que el panel de redacción asistida).
 */
export function EquipmentPhotosSection({
  equipmentId,
  initialPhotos,
  canDelete,
}: EquipmentPhotosSectionProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [photos, setPhotos] = useState(initialPhotos);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(
    () => initialPhotos.find((photo) => photo.isCover)?.id ?? null,
  );
  const [settingCoverId, setSettingCoverId] = useState<string | null>(null);

  const isFull = photos.length >= MAX_PHOTOS_PER_EQUIPMENT;

  const uploadDisabledReason = !isOnline ? (
    <span className="flex items-center gap-1.5">
      <WifiOff className="size-3.5 shrink-0" aria-hidden="true" />
      Requiere conexión. Sin señal no se pueden subir fotos del equipo; inténtalo cuando vuelva.
    </span>
  ) : isFull ? (
    `El equipo ya tiene ${MAX_PHOTOS_PER_EQUIPMENT} fotos, el máximo.${
      canDelete ? " Borra una para agregar otra." : " Un administrador o coordinador puede borrar una."
    }`
  ) : undefined;

  async function handleSetCover(photo: EquipmentPhoto) {
    setSettingCoverId(photo.id);
    const result = await setEquipmentCoverPhotoAction(equipmentId, photo.id);
    setSettingCoverId(null);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo marcar la portada");
      return;
    }

    setCoverPhotoId(result.coverPhotoId ?? null);
    toast.success("Portada actualizada");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">
        Fotos del equipo · {photos.length}/{MAX_PHOTOS_PER_EQUIPMENT}
      </h3>
      <PhotoGallery
        className=""
        uploadUrl={`/api/upload/equipment-photos/${equipmentId}`}
        photos={photos}
        setPhotos={setPhotos}
        photoAlt="Foto del equipo"
        uploadDisabledReason={uploadDisabledReason}
        onPhotoUploaded={(photo) => {
          if (photo.isCover) setCoverPhotoId(photo.id);
        }}
        onDelete={
          canDelete
            ? async (photo) => {
                const result = await deleteEquipmentPhotoAction(equipmentId, photo.id);
                if (result.ok) setCoverPhotoId(result.coverPhotoId ?? null);
                return result;
              }
            : undefined
        }
        renderPhotoOverlay={(photo) =>
          photo.id === coverPhotoId ? (
            <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
              <Star className="size-3 fill-current" aria-hidden="true" />
              Portada
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleSetCover(photo)}
              disabled={!isOnline || settingCoverId !== null}
              aria-label="Marcar como portada"
              title={isOnline ? "Marcar como portada" : "Requiere conexión"}
              className="absolute bottom-1.5 left-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
            >
              {settingCoverId === photo.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Star className="size-3.5" />
              )}
            </button>
          )
        }
      />
    </div>
  );
}
