"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight, CloudUpload, Loader2, X } from "lucide-react";
import { useQueueState } from "@/hooks/use-queue-state";
import { cn } from "@/lib/utils";
import { openQueuePanel } from "./queue-panel-store";

function pendingLabel(count: number): string {
  return count === 1 ? "1 cambio por subir" : `${count} cambios por subir`;
}

function parkedLabel(count: number): string {
  return count === 1 ? "1 cambio detenido" : `${count} cambios detenidos`;
}

/**
 * Indicador de la cola de cambios pendientes. Invisible con la cola vacía.
 * Rojo si hay operaciones detenidas (necesitan que el técnico las revise),
 * azul si solo hay operaciones esperando su turno. Tocarlo abre el panel
 * (queue-panel.tsx).
 *
 * - `strip`: franja delgada arriba, debajo del aviso de «sin conexión»,
 *   solo en celular (en escritorio está la fila de la barra lateral).
 * - `sidebar`: fila de la barra lateral de escritorio (app-shell.tsx).
 */
export function QueueStatusIndicator({ variant }: { variant: "strip" | "sidebar" }) {
  const { pendingCount, parkedCount, isUploading } = useQueueState();
  if (pendingCount === 0 && parkedCount === 0) return null;

  const hasParked = parkedCount > 0;
  const Icon = hasParked ? AlertTriangle : isUploading ? Loader2 : CloudUpload;
  const label = hasParked
    ? `${parkedLabel(parkedCount)} · revisar`
    : pendingLabel(pendingCount);
  const secondary = hasParked && pendingCount > 0 ? pendingLabel(pendingCount) : null;

  if (variant === "strip") {
    return (
      <button
        type="button"
        onClick={openQueuePanel}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 px-4 py-1 text-xs font-medium md:hidden",
          hasParked ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className={cn("size-3.5 shrink-0", !hasParked && isUploading && "animate-spin")} aria-hidden="true" />
        <span className="truncate">
          {label}
          {secondary && <span className="font-normal"> · {secondary}</span>}
        </span>
        <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openQueuePanel}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors",
        hasParked ? "bg-destructive/10 text-destructive hover:bg-destructive/15" : "bg-primary/10 text-primary hover:bg-primary/15",
      )}
    >
      <Icon className={cn("size-4 shrink-0", !hasParked && isUploading && "animate-spin")} aria-hidden="true" />
      <span className="flex flex-col">
        <span>{label}</span>
        {secondary && <span className="text-xs font-normal">{secondary}</span>}
      </span>
    </button>
  );
}

/**
 * Celular compartido: hay cambios sin subir de OTRO usuario. Aviso neutro
 * — ni contenido ni nombre (ver PendingOperation.userId: el motor jamás los
 * sube con esta sesión). Se puede cerrar; vuelve a aparecer al recargar.
 */
export function OtherUsersQueueNotice() {
  const { otherUsersCount } = useQueueState();
  const [dismissed, setDismissed] = useState(false);
  if (otherUsersCount === 0 || dismissed) return null;

  return (
    <div className="flex w-full items-center gap-2 bg-muted px-4 py-1 text-xs text-muted-foreground">
      <p className="flex-1 text-center">
        Este celular tiene cambios sin subir de otro usuario. Se subirán cuando
        esa persona vuelva a entrar aquí.
      </p>
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => setDismissed(true)}
        className="-mr-2 flex size-7 shrink-0 items-center justify-center rounded"
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
