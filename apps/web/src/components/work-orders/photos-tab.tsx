"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Loader2, Trash2, X } from "lucide-react";
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

interface QueuedPhoto {
  id: string;
  file: File;
}

interface FailedUpload {
  id: string;
  file: File;
  message: string;
}

type UploadOutcome =
  | { ok: true; photo: Attachment }
  | { ok: false; message: string };

/** Debe reflejar MAX_IMAGE_SIZE_BYTES en packages/backend/src/cloudinary/image-upload.constants.ts */
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * No es una restricción técnica del backend (que sigue recibiendo una foto
 * por petición) — es evitar que alguien seleccione la galería completa por
 * accidente y quede atrapado en una subida de media hora en campo.
 */
const MAX_BATCH_SIZE = 20;

export function PhotosTab({
  orderId,
  initialPhotos,
  isTerminal,
}: PhotosTabProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [failedUploads, setFailedUploads] = useState<FailedUpload[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nextQueueId = useRef(0);

  function makeQueueId(): string {
    nextQueueId.current += 1;
    return `photo-${nextQueueId.current}`;
  }

  /**
   * Sube una sola foto. `silent` suprime los toasts individuales cuando
   * corre dentro de una tanda de varias fotos (ahí el resumen lo da
   * runUploadBatch al final) — para una foto sola (cámara, o elegir
   * exactamente un archivo de la galería) mantiene el mismo mensaje de
   * siempre, sin ningún cambio de comportamiento.
   */
  async function uploadOnePhoto(
    file: File,
    { silent }: { silent: boolean },
  ): Promise<UploadOutcome> {
    try {
      const compressed = await compressImage(file);

      if (compressed.size > MAX_UPLOAD_SIZE_BYTES) {
        const message =
          "La foto es demasiado grande incluso después de comprimirla (máx. 10MB). Prueba con otra foto.";
        if (!silent) toast.error(message);
        return { ok: false, message };
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
        const message =
          "No se pudo subir la foto: sin conexión a internet o el servidor no respondió. Intenta de nuevo.";
        if (!silent) toast.error(message);
        return { ok: false, message };
      }

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const backendMessage = (data as UploadErrorBody | null)?.message;
        console.error(
          `Subida de foto falló (HTTP ${response.status}):`,
          backendMessage ?? data,
        );
        const message = backendMessage ?? "No se pudo subir la foto. Intenta de nuevo.";
        if (!silent) toast.error(message);
        return { ok: false, message };
      }

      if (!silent) toast.success("Foto agregada");
      return { ok: true, photo: data as Attachment };
    } catch (error) {
      console.error("Error inesperado al subir la foto:", error);
      const message = "No se pudo subir la foto. Intenta de nuevo.";
      if (!silent) toast.error(message);
      return { ok: false, message };
    }
  }

  /**
   * Sube la cola SECUENCIALMENTE, una foto tras otra — nunca en paralelo.
   * Con señal débil (la condición normal en campo), varias subidas
   * simultáneas se estorban entre sí, agotan el tiempo límite y fallan
   * todas; una a la vez aprovecha el reintento que ya trae uploadOnePhoto
   * (vía compressImage/fetch) y termina siendo más rápida en la práctica.
   *
   * Cada foto que se sube con éxito entra a la grilla de inmediato (no se
   * espera a que termine la tanda completa), y una que falla no bota a
   * las demás: sigue con la siguiente y la deja disponible para reintentar
   * sin que el usuario tenga que volver a elegirla.
   */
  async function runUploadBatch(queue: QueuedPhoto[]) {
    if (queue.length === 0) return;

    const silent = queue.length > 1;
    setIsUploading(true);
    if (silent) setUploadProgress({ current: 0, total: queue.length });

    const failures: FailedUpload[] = [];
    let successCount = 0;

    for (let i = 0; i < queue.length; i++) {
      if (silent) setUploadProgress({ current: i + 1, total: queue.length });

      const { id, file } = queue[i];
      const outcome = await uploadOnePhoto(file, { silent });

      if (outcome.ok) {
        successCount++;
        setPhotos((current) => [outcome.photo, ...current]);
      } else {
        failures.push({ id, file, message: outcome.message });
      }
    }

    setUploadProgress(null);
    setIsUploading(false);

    setFailedUploads((current) => {
      const retriedIds = new Set(queue.map((q) => q.id));
      const stillPending = current.filter((f) => !retriedIds.has(f.id));
      return [...stillPending, ...failures];
    });

    if (silent) {
      if (failures.length === 0) {
        toast.success(`${successCount} fotos agregadas`);
      } else if (successCount === 0) {
        toast.error(`No se pudo subir ninguna de las ${queue.length} fotos.`);
      } else {
        toast.error(
          `Se subieron ${successCount} de ${queue.length} fotos. ${failures.length} fallaron — puedes reintentarlas abajo.`,
        );
      }
    }

    if (successCount > 0) router.refresh();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    event.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!fileList || fileList.length === 0) return;

    if (fileList.length > MAX_BATCH_SIZE) {
      toast.error(
        `Elegiste ${fileList.length} fotos; el máximo por tanda es ${MAX_BATCH_SIZE}. Selecciona menos e inténtalo de nuevo.`,
      );
      return;
    }

    const queue: QueuedPhoto[] = Array.from(fileList).map((file) => ({
      id: makeQueueId(),
      file,
    }));

    await runUploadBatch(queue);
  }

  async function handleRetryFailed() {
    const queue: QueuedPhoto[] = failedUploads.map(({ id, file }) => ({ id, file }));
    await runUploadBatch(queue);
  }

  function handleDismissFailed(id: string) {
    setFailedUploads((current) => current.filter((f) => f.id !== id));
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
  const uploadLabel = uploadProgress
    ? `Subiendo ${uploadProgress.current} de ${uploadProgress.total}...`
    : isUploading
      ? "Subiendo..."
      : "Agregar fotos";

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
          {failedUploads.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm font-medium text-destructive">
                {failedUploads.length === 1
                  ? "1 foto no se pudo subir"
                  : `${failedUploads.length} fotos no se pudieron subir`}
              </p>
              <ul className="flex flex-col gap-1">
                {failedUploads.map((failed) => (
                  <li
                    key={failed.id}
                    className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                  >
                    <span className="truncate">
                      {failed.file.name} — {failed.message}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDismissFailed(failed.id)}
                      aria-label={`Descartar ${failed.file.name}`}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleRetryFailed()}
                disabled={isUploading}
                className="self-start"
              >
                Reintentar{failedUploads.length > 1 ? ` (${failedUploads.length})` : ""}
              </Button>
            </div>
          )}

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
            multiple
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
            {uploadLabel}
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
            {uploadLabel}
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
