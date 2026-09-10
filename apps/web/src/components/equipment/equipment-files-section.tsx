"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALLOWED_EQUIPMENT_FILE_MIME_TYPES,
  EQUIPMENT_FILE_ACCEPT,
  MAX_EQUIPMENT_FILE_BYTES,
  type EquipmentFile,
  type SignedUpload,
} from "@/lib/api/equipment-files";
import {
  EQUIPMENT_FILE_CATEGORIES,
  EQUIPMENT_FILE_CATEGORY_LABELS,
  equipmentFileCategoryLabel,
  type EquipmentFileCategory,
} from "@/lib/equipment-file-category";
import { formatDate } from "@/lib/format/dates";
import { formatFileSize } from "@/lib/format/file-size";
import {
  reportRequestFailure,
  reportRequestSuccess,
} from "@/lib/connectivity/store";

/**
 * Apartado de archivos de la ficha del equipo (manuales, certificaciones,
 * planos), junto al historial de órdenes.
 *
 * Se carga DEL LADO DEL CLIENTE a propósito: así distingue tres estados que
 * un fetch en el servidor colapsaría en una lista vacía —
 *   · cargados (puede haber cero: "sin archivos todavía")
 *   · SIN CONEXIÓN ("no disponibles sin conexión" — nunca vacío en silencio,
 *     que se leería como "este equipo no tiene manuales" y sería falso)
 *   · error del servidor
 * Mismo principio que el resto del módulo offline: nada que parezca una cosa
 * y sea otra.
 *
 * SUBIDA EN TRES PASOS (el archivo NO pasa por Next — las funciones de
 * Vercel cortan el cuerpo en ~4.5 MB y un manual pesa mucho más):
 *   1. /archivos/firma  → el backend firma una URL de subida de un solo uso
 *   2. PUT del archivo DIRECTO a Supabase (este fetch va del navegador a
 *      supabase.co, no a nuestro servidor)
 *   3. /archivos        → el backend verifica el objeto contra Supabase y
 *      crea la fila. Si esto falla, el archivo queda huérfano en Supabase
 *      (tolerable); nunca hay fila sin archivo.
 *
 * TODO — "LLEVAR ESTE ARCHIVO CONMIGO": el técnico que más necesita el
 * manual es el que está en un cuarto de máquinas sin señal, y hoy no puede
 * abrirlo (no hay soporte offline para estos archivos, a propósito). El
 * paso natural es una descarga explícita al dispositivo desde acá, con la
 * conexión que sí tiene antes de entrar. Es otra entrega.
 */

interface EquipmentFilesSectionProps {
  equipmentId: string;
  /** Solo ADMIN (candado replicado en el backend). */
  canDelete: boolean;
}

type LoadStatus = "loading" | "loaded" | "offline" | "error";

type UploadStage = "sign" | "upload" | "register";

const UPLOAD_STAGE_LABEL: Record<UploadStage, string> = {
  sign: "Preparando…",
  upload: "Subiendo…",
  register: "Registrando…",
};

interface PendingUpload {
  file: File;
  category: EquipmentFileCategory;
  description: string;
}

function isAllowedFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if ((ALLOWED_EQUIPMENT_FILE_MIME_TYPES as readonly string[]).includes(type)) {
    return true;
  }
  // Algunos navegadores no ponen type en un PDF elegido del explorador.
  return type === "" && /\.pdf$/i.test(file.name);
}

export function EquipmentFilesSection({
  equipmentId,
  canDelete,
}: EquipmentFilesSectionProps) {
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [files, setFiles] = useState<EquipmentFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<EquipmentFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Función NO async y sin setState en su cuerpo síncrono: todo el estado se
  // toca dentro de los callbacks de .then/.catch, que corren de forma
  // asíncrona (regla react-hooks/set-state-in-effect — no queremos renders
  // en cascada al montar). `status` ya arranca en "loading"; el reintento
  // manual resetea a "loading" desde su propio handler, no desde el effect.
  const fetchFiles = useCallback(() => {
    return fetch(`/api/equipos/${equipmentId}/archivos`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null);
          reportRequestSuccess(); // hubo respuesta: no es un problema de red
          setErrorMessage(
            (body as { message?: string } | null)?.message ??
              "No se pudieron cargar los archivos de este equipo.",
          );
          setStatus("error");
          return;
        }
        reportRequestSuccess();
        setFiles((await response.json()) as EquipmentFile[]);
        setStatus("loaded");
      })
      .catch(() => {
        reportRequestFailure();
        setStatus("offline");
      });
  }, [equipmentId]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  function retry() {
    setStatus("loading");
    setErrorMessage(null);
    void fetchFiles();
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo
    if (!file) return;

    if (file.size > MAX_EQUIPMENT_FILE_BYTES) {
      toast.error(
        `El archivo pesa ${formatFileSize(file.size)}. El máximo es ${formatFileSize(
          MAX_EQUIPMENT_FILE_BYTES,
        )}.`,
      );
      return;
    }
    if (!isAllowedFile(file)) {
      toast.error("Solo se admiten archivos PDF o imágenes (JPG, PNG, WEBP, HEIC).");
      return;
    }

    setPending({ file, category: "USER_MANUAL", description: "" });
  }

  async function handleUpload() {
    if (!pending) return;
    const { file, category, description } = pending;

    try {
      // Paso 1 — firma
      setUploadStage("sign");
      const signRes = await fetch(
        `/api/equipos/${equipmentId}/archivos/firma`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalName: file.name,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
            category,
          }),
        },
      );
      if (!signRes.ok) {
        reportRequestSuccess();
        const body: unknown = await signRes.json().catch(() => null);
        toast.error(
          (body as { message?: string } | null)?.message ??
            "No se pudo preparar la subida.",
        );
        setUploadStage(null);
        return;
      }
      const { uploadUrl, storagePath } = (await signRes.json()) as SignedUpload;

      // Paso 2 — PUT directo a Supabase (no pasa por Next)
      setUploadStage("upload");
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);

      let storageRes: Response;
      try {
        storageRes = await fetch(uploadUrl, {
          method: "PUT",
          // El Content-Type (multipart con boundary) lo pone el navegador
          // solo al pasar un FormData — no fijarlo a mano.
          headers: { "x-upsert": "false" },
          body: form,
        });
      } catch {
        reportRequestFailure();
        toast.error(
          "No se pudo subir el archivo: sin conexión o el almacenamiento no respondió. Intenta de nuevo.",
        );
        setUploadStage(null);
        return;
      }
      if (!storageRes.ok) {
        toast.error(
          "El almacenamiento rechazó el archivo. Verifica que sea un PDF o una imagen y que no supere el límite.",
        );
        setUploadStage(null);
        return;
      }

      // Paso 3 — registro (verificación autoritativa en el backend)
      setUploadStage("register");
      const registerRes = await fetch(`/api/equipos/${equipmentId}/archivos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath,
          originalName: file.name,
          category,
          description: description.trim() || undefined,
        }),
      });
      if (!registerRes.ok) {
        reportRequestSuccess();
        const body: unknown = await registerRes.json().catch(() => null);
        toast.error(
          (body as { message?: string } | null)?.message ??
            "El archivo se subió pero no se pudo registrar. Intenta de nuevo.",
        );
        setUploadStage(null);
        return;
      }

      reportRequestSuccess();
      toast.success("Archivo agregado");
      setPending(null);
      setUploadStage(null);
      void fetchFiles();
    } catch (error) {
      console.error("Error inesperado al subir el archivo:", error);
      toast.error("No se pudo subir el archivo. Intenta de nuevo.");
      setUploadStage(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/equipos/${equipmentId}/archivos/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        toast.error(
          (body as { message?: string } | null)?.message ??
            "No se pudo eliminar el archivo.",
        );
        return;
      }
      toast.success("Archivo eliminado");
      setDeleteTarget(null);
      void fetchFiles();
    } catch {
      toast.error("No se pudo contactar al servidor. Intenta de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  }

  const isUploading = uploadStage !== null;
  const grouped = EQUIPMENT_FILE_CATEGORIES.map((category) => ({
    category,
    items: files.filter((file) => file.category === category),
  })).filter((group) => group.items.length > 0);
  // Categorías desconocidas (dato de una versión más nueva del backend): al final.
  const known = new Set<string>(EQUIPMENT_FILE_CATEGORIES);
  const orphanCategoryItems = files.filter((file) => !known.has(file.category));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">
          Archivos del equipo
          {status === "loaded" ? ` · ${files.length}` : ""}
        </h3>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={EQUIPMENT_FILE_ACCEPT}
            onChange={handlePick}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading || pending !== null}
          >
            <Upload className="size-4" />
            Subir archivo
          </Button>
        </div>
      </div>

      {pending && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{pending.file.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(pending.file.size)}
            </span>
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Categoría
            <select
              value={pending.category}
              onChange={(event) =>
                setPending((current) =>
                  current
                    ? {
                        ...current,
                        category: event.target.value as EquipmentFileCategory,
                      }
                    : current,
                )
              }
              disabled={isUploading}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
            >
              {EQUIPMENT_FILE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EQUIPMENT_FILE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Descripción (opcional)
            <input
              type="text"
              value={pending.description}
              maxLength={500}
              onChange={(event) =>
                setPending((current) =>
                  current
                    ? { ...current, description: event.target.value }
                    : current,
                )
              }
              disabled={isUploading}
              placeholder="Ej. Manual de programación del tablero, rev. 2019"
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
            />
          </label>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void handleUpload()}
              disabled={isUploading}
            >
              {isUploading && <Loader2 className="size-4 animate-spin" />}
              {isUploading ? UPLOAD_STAGE_LABEL[uploadStage] : "Subir"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPending(null)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {status === "loading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando archivos…
        </p>
      )}

      {status === "offline" && (
        <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <WifiOff className="size-4" />
            Los archivos no están disponibles sin conexión
          </p>
          <p className="text-amber-800">
            Este equipo puede tener manuales y certificaciones cargados; no se
            pueden mostrar sin señal. Vuelve a intentarlo cuando tengas
            conexión.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={retry}
            className="self-start border-amber-300 bg-white hover:bg-amber-100"
          >
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="text-destructive">{errorMessage}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={retry}
            className="self-start"
          >
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
        </div>
      )}

      {status === "loaded" && files.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Este equipo no tiene archivos adjuntos todavía.
        </p>
      )}

      {status === "loaded" && files.length > 0 && (
        <div className="flex flex-col gap-4">
          {[
            ...grouped,
            ...(orphanCategoryItems.length > 0
              ? [{ category: "__other__", items: orphanCategoryItems }]
              : []),
          ].map((group) => (
            <div key={group.category} className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.category === "__other__"
                  ? "Otro"
                  : equipmentFileCategoryLabel(group.category)}
              </h4>
              <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                {group.items.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-start justify-between gap-3 p-3"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-2 font-medium">
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{file.originalName}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.sizeBytes)}
                        {" · "}
                        {file.uploadedBy?.name ?? "Autor desconocido"}
                        {" · "}
                        {formatDate(file.createdAt)}
                      </span>
                      {file.description && (
                        <span className="text-xs text-muted-foreground">
                          {file.description}
                        </span>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <a
                        href={`/api/equipos/${equipmentId}/archivos/${file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-primary hover:bg-primary/10"
                      >
                        <Download className="size-3.5" />
                        Abrir
                      </a>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(file)}
                          aria-label={`Eliminar ${file.originalName}`}
                          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar archivo</DialogTitle>
            <DialogDescription>
              Se eliminará &quot;{deleteTarget?.originalName}&quot;. Esta acción
              es irreversible y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando…" : "Eliminar archivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
