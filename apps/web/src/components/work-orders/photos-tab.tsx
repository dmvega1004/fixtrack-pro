"use client";

import { useState } from "react";
import type { Attachment } from "@/lib/api/attachments";
import { removePhotoAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { PhotoGallery } from "@/components/shared/photo-gallery";

interface PhotosTabProps {
  orderId: string;
  initialPhotos: Attachment[];
  isTerminal: boolean;
}

/**
 * Pestaña «Fotos» de la orden. La cola de subida, la compresión, los
 * reintentos y la grilla viven en PhotoGallery (compartida con la galería
 * del equipo); acá solo queda lo propio de la orden.
 */
export function PhotosTab({
  orderId,
  initialPhotos,
  isTerminal,
}: PhotosTabProps) {
  const [photos, setPhotos] = useState(initialPhotos);

  return (
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
    />
  );
}
