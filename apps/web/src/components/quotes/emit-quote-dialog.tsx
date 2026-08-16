"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sendQuoteAction } from "@/app/(dashboard)/cotizaciones/actions";

interface EmitQuoteDialogProps {
  quoteId: string;
}

/**
 * Reemplaza el antiguo window.confirm() de "Enviar": además de verse mejor,
 * un diálogo nativo del navegador bloquea la automatización (no se puede
 * verificar) y congela la pestaña hasta que alguien lo cierra a mano.
 *
 * Al confirmar, emite Y lleva directo al documento — emitir y entregar son
 * un solo movimiento en la práctica; separarlos con un paso intermedio no
 * aporta nada.
 */
export function EmitQuoteDialog({ quoteId }: EmitQuoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (isEmitting) return;
    setOpen(next);
  }

  async function handleConfirm() {
    setIsEmitting(true);
    const result = await sendQuoteAction(quoteId);
    setIsEmitting(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo emitir la cotización");
      return;
    }

    toast.success("Cotización emitida");
    setOpen(false);
    router.push(`/cotizaciones/${quoteId}/documento`);
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <FileCheck2 className="size-4" />
        Emitir cotización
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir cotización</DialogTitle>
            <DialogDescription>
              Se asignará el número consecutivo y los valores quedarán fijos.
              Después de emitirla no podrás editarla: si necesitas cambiar
              algo tendrás que duplicarla. ¿Continuar?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isEmitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={isEmitting}>
              {isEmitting ? "Emitiendo..." : "Emitir cotización"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
