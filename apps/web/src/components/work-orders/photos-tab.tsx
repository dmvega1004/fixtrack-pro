"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/lib/api/attachments";
import { removePhotoAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface PhotosTabProps {
  orderId: string;
  initialPhotos: Attachment[];
  isTerminal: boolean;
}

interface UploadErrorBody {
  message?: string;
}

export function PhotosTab({
  orderId,
  initialPhotos,
  isTerminal,
}: PhotosTabProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después

    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/upload/photos/${orderId}`, {
        method: "POST",
        body: formData,
      });
      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = (data as UploadErrorBody | null)?.message;
        toast.error(message ?? "No se pudo subir la foto");
        return;
      }

      setPhotos((current) => [data as Attachment, ...current]);
      toast.success("Foto agregada");
      router.refresh();
    } catch {
      toast.error("No se pudo subir la foto");
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
                  src={photo.url}
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
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => void handleFileChange(event)}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="self-start"
          >
            <Camera className="size-4" />
            {isUploading ? "Subiendo..." : "Agregar foto"}
          </Button>
        </>
      )}
    </div>
  );
}
