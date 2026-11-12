"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Star } from "lucide-react";
import type { Attachment } from "@/lib/api/attachments";
import type { WorkOrderEquipment } from "@/lib/api/work-orders";
import { removePhotoAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { setEquipmentCoverFromOrderPhotoAction } from "@/app/(dashboard)/equipos/actions";
import { PhotoGallery } from "@/components/shared/photo-gallery";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnlineStatus } from "@/hooks/use-online-status";

interface PhotosTabProps {
  orderId: string;
  initialPhotos: Attachment[];
  isTerminal: boolean;
  /** Equipos enlazados a la orden: destino de «Usar como portada del equipo». */
  equipments: WorkOrderEquipment[];
}

const equipmentLabel = (equipment: WorkOrderEquipment) =>
  `${equipment.brand} ${equipment.model}`;

/**
 * Pestaña «Fotos» de la orden. La cola de subida, la compresión, los
 * reintentos y la grilla viven en PhotoGallery (compartida con la galería
 * del equipo); acá solo queda lo propio de la orden.
 *
 * «Usar como portada del equipo»: el técnico ya fotografía el equipo en
 * cada orden, así que cualquier foto de la orden puede pasar a ser la
 * portada de uno de sus equipos (el backend la COPIA, no la comparte). Con
 * un equipo se aplica directo; con varios, se pregunta a cuál. También en
 * una orden cerrada: copiar la foto no cambia la orden. Sin señal, el
 * botón queda desactivado (no hay cola sin conexión para esto).
 */
export function PhotosTab({
  orderId,
  initialPhotos,
  isTerminal,
  equipments,
}: PhotosTabProps) {
  const isOnline = useOnlineStatus();
  const [photos, setPhotos] = useState(initialPhotos);
  const [choosingFor, setChoosingFor] = useState<Attachment | null>(null);
  const [applyingPhotoId, setApplyingPhotoId] = useState<string | null>(null);

  async function applyCover(photo: Attachment, equipment: WorkOrderEquipment) {
    setApplyingPhotoId(photo.id);
    const result = await setEquipmentCoverFromOrderPhotoAction(
      equipment.id,
      photo.id,
    );
    setApplyingPhotoId(null);
    setChoosingFor(null);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo usar la foto como portada");
      return;
    }
    toast.success(`Ahora es la portada de ${equipmentLabel(equipment)}`);
  }

  function handleUseAsCover(photo: Attachment) {
    if (equipments.length === 1) {
      void applyCover(photo, equipments[0]);
    } else {
      setChoosingFor(photo);
    }
  }

  return (
    <>
      <PhotoGallery
        uploadUrl={`/api/upload/photos/${orderId}`}
        photos={photos}
        setPhotos={setPhotos}
        photoAlt="Foto de la orden"
        readOnlyNotice={
          isTerminal
            ? "La orden está en estado terminal: no admite nuevas fotos."
            : undefined
        }
        onDelete={(photo) => removePhotoAction(orderId, photo.id)}
        renderPhotoOverlay={
          equipments.length === 0
            ? undefined
            : (photo) => (
                <button
                  type="button"
                  onClick={() => handleUseAsCover(photo)}
                  disabled={!isOnline || applyingPhotoId !== null}
                  aria-label="Usar como portada del equipo"
                  title={
                    isOnline
                      ? "Usar como portada del equipo"
                      : "Requiere conexión"
                  }
                  className="absolute bottom-1.5 left-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
                >
                  {applyingPhotoId === photo.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Star className="size-3.5" />
                  )}
                </button>
              )
        }
      />

      <Dialog
        open={choosingFor !== null}
        onOpenChange={(open) => {
          if (!open && applyingPhotoId === null) setChoosingFor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar como portada de…</DialogTitle>
            <DialogDescription>
              Esta orden tiene varios equipos. Elige el que aparece en la foto.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {equipments.map((equipment) => (
              <button
                key={equipment.id}
                type="button"
                disabled={applyingPhotoId !== null || !isOnline}
                onClick={() => {
                  if (choosingFor) void applyCover(choosingFor, equipment);
                }}
                className="flex min-h-12 flex-col items-start justify-center rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
              >
                <span className="line-clamp-2 text-sm font-medium break-words">
                  {equipmentLabel(equipment)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[equipment.location, equipment.serialNumber]
                    .filter(Boolean)
                    .join(" · ") || "Sin ubicación ni serial"}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
