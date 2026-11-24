"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, Copy, Loader2, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useQueueState } from "@/hooks/use-queue-state";
import { useSyncState } from "@/hooks/use-sync-state";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatTime } from "@/lib/format/dates";
import { discardOperation, reactivateOperation, retryNow } from "@/lib/queue/engine";
import {
  describeField,
  describeParkReason,
  describeWaitingReason,
  operationFragment,
  operationValue,
} from "@/lib/queue/describe";
import type { PendingOperation } from "@/lib/queue/types";
import { cn } from "@/lib/utils";
import { setQueuePanelOpen, useQueuePanelOpen } from "./queue-panel-store";

/** "hace 3 min" — el técnico necesita saber cuánto lleva esperando, no la hora exacta. */
function formatWaiting(enqueuedAt: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - new Date(enqueuedAt).getTime()) / 60_000));
  if (minutes < 1) return "hace menos de un minuto";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h ${minutes % 60} min`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/** Re-render cada 30 s mientras el panel esté abierto, para que "hace N min" avance solo. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    // Al abrir: el valor guardado puede ser de hace horas (montaje del layout).
    const first = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [active]);
  return now;
}

/**
 * Pantalla de estado de la cola de cambios pendientes — panel, no página:
 * una ruta nueva no estaría en el shell sin señal (public/sw.js), y este
 * panel tiene que funcionar justo sin señal.
 */
export function QueuePanel({ userId }: { userId: string }) {
  const open = useQueuePanelOpen();
  const isMobile = useIsMobile();
  const { operations, pendingCount, parkedCount, isUploading, uploadingSeq, nextRetryAt, lastError, isOnline } =
    useQueueState();
  const { workset } = useSyncState();
  const now = useNow(open);

  function orderLabel(op: PendingOperation): string {
    const number =
      op.orderNumber ?? workset?.orders.find((order) => order.id === op.orderId)?.orderNumber;
    return number !== undefined ? formatOrderNumber(number) : "Orden que ya no está en el celular";
  }

  const canRetry = pendingCount > 0 && !isUploading && isOnline;

  return (
    <Sheet open={open} onOpenChange={setQueuePanelOpen}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "gap-0 overflow-y-auto p-0",
          isMobile ? "max-h-[85svh] pb-[env(safe-area-inset-bottom)]" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>Cambios guardados en el celular</SheetTitle>
          <SheetDescription>
            {operations.length === 0
              ? "No hay cambios pendientes en este celular."
              : [
                  pendingCount > 0 && (pendingCount === 1 ? "1 por subir" : `${pendingCount} por subir`),
                  parkedCount > 0 && (parkedCount === 1 ? "1 detenido" : `${parkedCount} detenidos`),
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </SheetDescription>

          {lastError === "unauthorized" && (
            <p className="mt-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-medium text-amber-900">
              Tu sesión venció. Entra de nuevo con tu usuario para que estos cambios se suban.
            </p>
          )}

          {pendingCount > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <Button onClick={() => retryNow(userId)} disabled={!canRetry} className="self-start">
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden="true" /> Subiendo…
                  </>
                ) : (
                  <>
                    <RotateCw aria-hidden="true" /> Reintentar ahora
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                {!isOnline
                  ? "Sin señal: se suben solos cuando vuelva la conexión."
                  : nextRetryAt && !isUploading
                    ? `Próximo intento automático a las ${formatTime(nextRetryAt)}.`
                    : "Se suben en el mismo orden en que los guardaste."}
              </p>
            </div>
          )}
        </SheetHeader>

        {operations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="size-8 text-emerald-600" aria-hidden="true" />
            No hay cambios esperando.
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {operations.map((op) => (
              <OperationRow
                key={op.seq}
                op={op}
                userId={userId}
                orderLabel={orderLabel(op)}
                isUploadingThis={uploadingSeq === op.seq}
                now={now}
              />
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OperationRow({
  op,
  userId,
  orderLabel,
  isUploadingThis,
  now,
}: {
  op: PendingOperation;
  userId: string;
  orderLabel: string;
  isUploadingThis: boolean;
  now: number;
}) {
  const waitingReason = !op.parked ? describeWaitingReason(op) : null;

  return (
    <li className={cn("flex flex-col gap-1.5 p-4", op.parked && "bg-destructive/5")}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">
          {orderLabel} · {describeField(op)}
        </p>
        <StateBadge parked={op.parked} uploading={isUploadingThis} />
      </div>
      {!op.parked && <p className="text-sm text-muted-foreground">{operationFragment(op)}</p>}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="size-3" aria-hidden="true" />
        Guardado {formatWaiting(op.enqueuedAt, now)} ({formatTime(op.enqueuedAt)})
        {waitingReason && !isUploadingThis && <> · {waitingReason}</>}
      </p>
      {op.parked && <ParkedDetail op={op} userId={userId} />}
    </li>
  );
}

function StateBadge({ parked, uploading }: { parked: boolean; uploading: boolean }) {
  if (parked) {
    return (
      <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
        Detenido
      </span>
    );
  }
  if (uploading) {
    return (
      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
        <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Subiendo
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Esperando
    </span>
  );
}

/**
 * Operación detenida: el motivo, el texto COMPLETO (es la única copia de
 * lo que el técnico escribió), copiar, y descartar con confirmación — nada
 * se borra sin que él lo decida.
 */
function ParkedDetail({ op, userId }: { op: PendingOperation; userId: string }) {
  const reason = describeParkReason(op);
  const value = operationValue(op);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Texto copiado");
    } catch {
      // WebView sin permiso de portapapeles: se deja seleccionado para copiarlo a mano.
      textRef.current?.focus();
      textRef.current?.select();
      toast.info("Texto seleccionado: mantén presionado y elige «Copiar»");
    }
  }

  async function handleReactivate() {
    setBusy(true);
    const ok = await reactivateOperation(userId, op.seq);
    setBusy(false);
    if (!ok) toast.error("No se pudo volver a poner en la fila");
  }

  async function handleDiscard() {
    setBusy(true);
    const ok = await discardOperation(userId, op.seq);
    setBusy(false);
    setConfirmOpen(false);
    if (ok) toast.success("Cambio descartado");
    else toast.error("No se pudo descartar");
  }

  return (
    <div className="mt-1 flex flex-col gap-2">
      <p className="flex items-start gap-1.5 text-sm font-medium text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {reason.message}
      </p>

      <textarea
        ref={textRef}
        readOnly
        value={value}
        rows={Math.min(6, Math.max(2, value.split("\n").length))}
        aria-label={`Texto de ${describeField(op)}`}
        className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm"
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
          <Copy aria-hidden="true" /> Copiar
        </Button>
        {reason.kind === "exhausted" && (
          <Button variant="outline" size="sm" onClick={() => void handleReactivate()} disabled={busy}>
            <RotateCw aria-hidden="true" /> Volver a intentar
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={busy}>
          <Trash2 aria-hidden="true" /> Descartar
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Descartar este cambio?</DialogTitle>
            <DialogDescription>
              El texto de {describeField(op).toLowerCase()} se borra de este celular y no se podrá
              recuperar. Si lo necesitas, cópialo antes.
            </DialogDescription>
          </DialogHeader>
          {/* flex-col-reverse en celular: «Cancelar» (último) queda arriba. */}
          <DialogFooter>
            <Button variant="destructive" onClick={() => void handleDiscard()} disabled={busy}>
              Descartar
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
