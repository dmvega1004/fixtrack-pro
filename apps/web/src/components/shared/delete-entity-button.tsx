"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteResult {
  ok: boolean;
  message?: string;
}

interface BlockedAlternative {
  /** Texto del botón alterno, ej. "Marcar como Cancelada". */
  label: string;
  action: () => Promise<DeleteResult>;
  successMessage: string;
}

interface DeleteEntityButtonProps {
  /** Identifica lo que se va a borrar, ej. "OT-0001" o "el equipo BFT PHOBOS BT A25 — Portón 1". */
  itemLabel: string;
  /** Texto del botón disparador y del botón de confirmar. Ej. "Eliminar orden". */
  triggerLabel: string;
  onDelete: () => Promise<DeleteResult>;
  /** Listado al que se redirige tras eliminar con éxito. */
  redirectTo: string;
  successMessage: string;
  /** Contenido extra dentro del diálogo (ej. qué se borra junto con esto), antes del área de error. */
  children?: ReactNode;
  /**
   * Salida alterna cuando el borrado queda bloqueado (409): se ofrece en el
   * propio diálogo de error, no obliga a adivinar qué hacer en su lugar.
   */
  blocked?: BlockedAlternative;
  className?: string;
}

/**
 * Botón de eliminación compartido por equipos, cotizaciones y órdenes — un
 * solo diálogo del sistema de diseño en vez de tres variantes repetidas.
 * Nunca window.confirm(): además de verse peor, congela la pestaña y
 * bloquea la automatización de pruebas.
 *
 * El candado de rol (SOLO ADMIN) vive en el componente que renderiza este
 * botón, que ya conoce la sesión — este componente asume que ya se decidió
 * mostrarlo.
 */
export function DeleteEntityButton({
  itemLabel,
  triggerLabel,
  onDelete,
  redirectTo,
  successMessage,
  children,
  blocked,
  className,
}: DeleteEntityButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRunningAlternative, setIsRunningAlternative] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isDeleting || isRunningAlternative;

  function handleOpenChange(next: boolean) {
    if (isBusy) return;
    setOpen(next);
    if (!next) setErrorMessage(null);
  }

  async function handleDelete() {
    setIsDeleting(true);
    const result = await onDelete();
    setIsDeleting(false);

    if (!result.ok) {
      setErrorMessage(result.message ?? "No se pudo eliminar.");
      return;
    }

    setOpen(false);
    toast.success(successMessage);
    router.push(redirectTo);
    router.refresh();
  }

  async function handleAlternative() {
    if (!blocked) return;
    setIsRunningAlternative(true);
    const result = await blocked.action();
    setIsRunningAlternative(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo completar la acción");
      return;
    }

    setOpen(false);
    toast.success(blocked.successMessage);
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={
          className ?? "self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
        }
      >
        <Trash2 className="size-3.5" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {itemLabel}</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {children}

          {errorMessage && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>{errorMessage}</p>
              {blocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start border-amber-300 bg-white hover:bg-amber-100"
                  onClick={() => void handleAlternative()}
                  disabled={isBusy}
                >
                  {isRunningAlternative ? "Aplicando..." : blocked.label}
                </Button>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isBusy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={isBusy}
            >
              {isDeleting ? "Eliminando..." : triggerLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
