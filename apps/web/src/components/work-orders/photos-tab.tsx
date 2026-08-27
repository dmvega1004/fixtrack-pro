"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Attachment } from "@/lib/api/attachments";
import { removePhotoAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { compressImage } from "@/lib/image/compress-image";
import { reportRequestFailure, reportRequestSuccess } from "@/lib/connectivity/store";
import { cloudinaryUrl } from "@/lib/image/cloudinary-url";

interface PhotosTabProps {
  orderId: string;
  initialPhotos: Attachment[];
  isTerminal: boolean;
}

interface UploadErrorBody {
  message?: string;
}

/** Debe reflejar MAX_IMAGE_SIZE_BYTES en packages/backend/src/cloudinary/image-upload.constants.ts */
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function PhotosTab({
  orderId,
  initialPhotos,
  isTerminal,
}: PhotosTabProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después

    if (!file) return;

    setIsUploading(true);
    try {
      const compressed = await compressImage(file);

      if (compressed.size > MAX_UPLOAD_SIZE_BYTES) {
        toast.error(
          "La foto es demasiado grande incluso después de comprimirla (máx. 10MB). Prueba con otra foto.",
        );
        return;
      }

      const formData = new FormData();
      formData.append("file", compressed);

      let response: Response;
      try {
        response = await fetch(`/api/upload/photos/${orderId}`, {
          method: "POST",
          body: formData,
        });
        reportRequestSuccess();
      } catch (networkError) {
        console.error("Error de red al subir la foto:", networkError);
        reportRequestFailure();
        toast.error(
          "No se pudo subir la foto: sin conexión a internet o el servidor no respondió. Intenta de nuevo.",
        );
        return;
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        console.error(
          `Subida de foto falló (HTTP ${response.status}):`,
          message ?? data,
        );
        toast.error(message ?? "No se pudo subir la foto. Intenta de nuevo.");
        return;
      }

      setPhotos((current) => [data as Attachment, ...current]);
      toast.success("Foto agregada");
      router.refresh();
    } catch (error) {
      console.error("Error inesperado al subir la foto:", error);
      toast.error("No se pudo subir la foto. Intenta de nuevo.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(photo: Attachment) {
    if (!window.confirm("¿Eliminar esta foto? No se puede deshacer.")) return;

    setDeletingId(photo.id);
    const result = await removePhotoAction(orderId, photo.id);
    setDeletingId(null);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar la foto");
      return;
    }

    setPhotos((current) => current.filter((p) => p.id !== photo.id));
    toast.success("Foto eliminada");
    router.refresh();
  }

  const isEmpty = photos.length === 0 && !isUploading;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">Sin fotos registradas.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {isUploading && (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-muted">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- foto remota en Cloudinary, sin dominio fijo que declarar */}
                <img
                  src={cloudinaryUrl(photo.url, "thumbnail")}
                  alt="Foto de la orden"
                  className="h-full w-full object-cover"
                />
              </a>
              {!isTerminal && (
                <button
                  type="button"
                  onClick={() => void handleDelete(photo)}
                  disabled={deletingId === photo.id}
                  aria-label="Eliminar foto"
                  className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
                >
                  {deletingId === photo.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isTerminal ? (
        <p className="text-xs text-muted-foreground">
          La orden está en estado terminal: no admite nuevas fotos.
        </p>
      ) : (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />

          {/* Móvil: hay cámara trasera, así que se ofrece elegir el origen. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setSourceSheetOpen(true)}
            disabled={isUploading}
            className="self-start md:hidden"
          >
            <Camera className="size-4" />
            {isUploading ? "Subiendo..." : "Agregar foto"}
          </Button>

          {/* Escritorio: no hay cámara trasera, se va directo al explorador de archivos. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploading}
            className="hidden self-start md:inline-flex"
          >
            <Camera className="size-4" />
            {isUploading ? "Subiendo..." : "Agregar foto"}
          </Button>

          <Sheet open={sourceSheetOpen} onOpenChange={setSourceSheetOpen}>
            <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)] md:hidden">
              <SheetHeader>
                <SheetTitle>Agregar foto</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4 pb-4">
                <button
                  type="button"
                  onClick={() => {
                    setSourceSheetOpen(false);
                    cameraInputRef.current?.click();
                  }}
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <Camera className="size-5" />
                  Tomar foto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceSheetOpen(false);
                    galleryInputRef.current?.click();
                  }}
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  <ImageIcon className="size-5" />
                  Elegir de la galería
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
