"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decideQuoteAction } from "@/app/(dashboard)/cotizaciones/actions";

interface RejectQuoteDialogProps {
  quoteId: string;
}

/** El motivo es obligatorio a propósito: sin él no hay forma de saber después si se perdió por precio, tiempo de entrega o falta de seguimiento. */
export function RejectQuoteDialog({ quoteId }: RejectQuoteDialogProps) {
  const router = useRouter();
  const textareaId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (isSaving) return;
    setOpen(next);
    if (!next) setReason("");
  }

  async function handleConfirm() {
    if (!reason.trim()) return;

    setIsSaving(true);
    const result = await decideQuoteAction(quoteId, {
      status: "REJECTED",
      rejectionReason: reason.trim(),
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo marcar como rechazada");
      return;
    }

    toast.success("Cotización marcada como rechazada");
    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <XCircle className="size-4" />
        Marcar rechazada
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar cotización como rechazada</DialogTitle>
            <DialogDescription>
              El motivo es obligatorio — es el dato que permite saber después
              si se pierde por precio, por tiempo de entrega o por falta de
              seguimiento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={textareaId}>Motivo del rechazo *</Label>
            <textarea
              id={textareaId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              placeholder="Ej. El cliente eligió otro proveedor por precio"
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirm()}
              disabled={!reason.trim() || isSaving}
            >
              {isSaving ? "Guardando..." : "Marcar rechazada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
