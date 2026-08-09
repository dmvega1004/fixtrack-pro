"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatOrderNumber } from "@/lib/format/order-number";
import { deleteWorkOrderAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface DeleteOrderButtonProps {
  orderId: string;
  orderNumber: number;
}

/** Solo ADMIN puede ver este botón (candado de rol replicado en el componente padre y en el backend). */
export function DeleteOrderButton({ orderId, orderNumber }: DeleteOrderButtonProps) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const expected = formatOrderNumber(orderNumber);
  const canDelete = confirmText.trim() === expected;

  function handleOpenChange(next: boolean) {
    if (isDeleting) return;
    setOpen(next);
    if (!next) setConfirmText("");
  }

  async function handleDelete() {
    if (!canDelete) return;

    setIsDeleting(true);
    const result = await deleteWorkOrderAction(orderId);
    setIsDeleting(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo eliminar la orden");
      return;
    }

    toast.success(`${expected} eliminada`);
    router.push("/ordenes");
    router.refresh();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        Eliminar orden
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {expected}</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Se eliminará permanentemente:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>La orden {expected} y toda su información.</li>
              <li>Sus fotos adjuntas.</li>
              <li>Sus pagos registrados y su valor en la cartera.</li>
            </ul>
            <p>
              Los repuestos consumidos por esta orden volverán al inventario
              automáticamente.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={inputId}>
              Escribe <span className="font-semibold text-foreground">{expected}</span> para
              confirmar
            </Label>
            <Input
              id={inputId}
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={expected}
              autoComplete="off"
              disabled={isDeleting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={!canDelete || isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar orden definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
