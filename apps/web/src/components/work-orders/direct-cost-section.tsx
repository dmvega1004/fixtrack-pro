"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format/currency";
import { saveDirectCostAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface DirectCostSectionProps {
  orderId: string;
  directCostAmount: string;
  directCostDescription: string | null;
  currency: string;
}

/**
 * Bloque "Costos internos" (pestaña «Valores», solo ADMIN — el padre no
 * renderiza este componente para otro rol). Deliberadamente separado del
 * cierre económico que ve el cliente (BillingSection): esto NUNCA se
 * factura ni entra en ningún total. Editable con la orden cerrada — la
 * factura del proveedor (torno, materiales de la obra) suele llegar días
 * después de entregado el trabajo, ver RBAC en WorkOrdersService.update.
 */
export function DirectCostSection({
  orderId,
  directCostAmount,
  directCostDescription,
  currency,
}: DirectCostSectionProps) {
  const router = useRouter();
  const [amount, setAmount] = useState(directCostAmount);
  const [description, setDescription] = useState(directCostDescription ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const numericAmount = Number(amount);
  const isValid = amount.trim() !== "" && !Number.isNaN(numericAmount) && numericAmount >= 0;
  const isDirty =
    numericAmount !== Number(directCostAmount) || description !== (directCostDescription ?? "");

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    setAmount(event.target.value);
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLInputElement>) {
    setDescription(event.target.value);
  }

  async function handleSave() {
    if (!isValid) return;

    setIsSaving(true);
    const result = await saveDirectCostAction(orderId, {
      directCostAmount: numericAmount,
      directCostDescription: description.trim(),
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar el costo interno");
      return;
    }

    toast.success("Costo interno guardado");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Costos internos</h3>
        <p className="text-xs text-muted-foreground">
          Lo que este trabajo te costó por fuera del inventario. No se le cobra al
          cliente ni aparece en ningún documento que él reciba.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="directCostAmount">Otros costos directos</Label>
          <Input
            id="directCostAmount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={handleAmountChange}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="directCostDescription">Descripción</Label>
          <Input
            id="directCostDescription"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Ej. Fabricación de cuña en torno — $40.000"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Actual: {formatCurrency(directCostAmount, currency)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleSave()}
          disabled={isSaving || !isValid || !isDirty}
        >
          {isSaving ? "Guardando..." : "Guardar costo interno"}
        </Button>
      </div>
    </div>
  );
}
