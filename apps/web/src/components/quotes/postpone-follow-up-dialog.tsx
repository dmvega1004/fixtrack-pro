"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneCall } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { postponeFollowUpAction } from "@/app/(dashboard)/cotizaciones/actions";

interface PostponeFollowUpDialogProps {
  quoteId: string;
}

const QUICK_OPTIONS = [3, 7, 15];

/**
 * Sin esto la tarjeta "por seguir" nunca se vacía: si el cliente pide más
 * tiempo y no hay decisión que tomar, la cotización quedaría marcada como
 * pendiente de seguimiento indefinidamente.
 */
export function PostponeFollowUpDialog({ quoteId }: PostponeFollowUpDialogProps) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (isSaving) return;
    setOpen(next);
    if (!next) {
      setDays(null);
      setCustomValue("");
    }
  }

  function selectQuick(value: number) {
    setDays(value);
    setCustomValue("");
  }

  function handleCustomChange(value: string) {
    setCustomValue(value);
    const parsed = Number(value);
    setDays(value.trim() !== "" && Number.isInteger(parsed) && parsed > 0 ? parsed : null);
  }

  async function handleConfirm() {
    if (!days) return;

    setIsSaving(true);
    const result = await postponeFollowUpAction(quoteId, days);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo posponer el seguimiento");
      return;
    }

    toast.success(`Seguimiento pospuesto ${days} día${days === 1 ? "" : "s"}`);
    setOpen(false);
    setDays(null);
    setCustomValue("");
    router.refresh();
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <PhoneCall className="size-4" />
        Posponer seguimiento
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Posponer seguimiento</DialogTitle>
            <DialogDescription>
              Recalcula la fecha de seguimiento a partir de hoy. Úsalo cuando el
              cliente pidió más tiempo y todavía no hay una decisión que tomar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectQuick(option)}
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
                    days === option && customValue === ""
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option} días
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>Otro número de días</Label>
              <Input
                id={inputId}
                type="number"
                min={1}
                max={365}
                value={customValue}
                onChange={(event) => handleCustomChange(event.target.value)}
                placeholder="Ej. 10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleConfirm()} disabled={!days || isSaving}>
              {isSaving ? "Guardando..." : "Posponer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
