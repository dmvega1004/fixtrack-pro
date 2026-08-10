"use client";

import { useId, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBilledAtAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface BilledAtEditorProps {
  orderId: string;
  /** ISO 8601 — WorkOrderBilling.billedAt de una orden ya congelada (nunca null en ese caso). */
  billedAt: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Corrección puntual de la fecha de facturación (pestaña «Valores», solo
 * ADMIN): el resto del cierre económico (montos, IVA) queda congelado para
 * siempre al pasar a COMPLETED, pero la fecha puede necesitar ajuste — ej.
 * para cargar trabajos históricos con su antigüedad real, o si la orden se
 * completó en el sistema días después del servicio real. Funciona incluso
 * si la orden ya quedó DELIVERED (sellada) — ver RBAC en el backend, que
 * también rechaza fechas futuras.
 */
export function BilledAtEditor({ orderId, billedAt }: BilledAtEditorProps) {
  const router = useRouter();
  const inputId = useId();
  const initialDate = billedAt.slice(0, 10);
  const [date, setDate] = useState(initialDate);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setDate(event.target.value);
  }

  async function handleSave() {
    if (!date) return;

    setIsSaving(true);
    const result = await saveBilledAtAction(orderId, date);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo actualizar la fecha de facturación");
      return;
    }

    toast.success("Fecha de facturación actualizada");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId} className="text-xs text-muted-foreground">
            Fecha de facturación
          </Label>
          <Input
            id={inputId}
            type="date"
            value={date}
            max={todayIso()}
            onChange={handleChange}
            className="w-40"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleSave()}
          disabled={isSaving || !date || date === initialDate}
        >
          {isSaving ? "Guardando..." : "Corregir fecha"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Determina el inicio del plazo de crédito del cliente en Cobros.
      </p>
    </div>
  );
}
