"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format/currency";
import type { WorkOrderBilling } from "@/lib/api/work-order-parts";
import { saveBillingAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface BillingSectionProps {
  orderId: string;
  billing: WorkOrderBilling;
  /** Total de repuestos (WorkOrderPartsSummary.totalSale). */
  partsTotal: string;
  currency: string;
  isAdmin: boolean;
  isTerminal: boolean;
}

interface BillingFormState {
  laborAmount: string;
  additionalAmount: string;
  additionalDescription: string;
  discountAmount: string;
}

function toFormState(billing: WorkOrderBilling): BillingFormState {
  return {
    laborAmount: billing.laborAmount,
    additionalAmount: billing.additionalAmount,
    additionalDescription: billing.additionalDescription ?? "",
    discountAmount: billing.discountAmount,
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

/**
 * Cierre económico de la orden (pestaña «Valores»). Editable solo por
 * ADMIN, y solo mientras la orden sigue abierta y no congelada — una vez
 * congelada (billing.isFrozen) se muestra siempre en modo lectura con la
 * nota de cierre, sin importar el rol.
 */
export function BillingSection({
  orderId,
  billing,
  partsTotal,
  currency,
  isAdmin,
  isTerminal,
}: BillingSectionProps) {
  const router = useRouter();
  const [form, setForm] = useState<BillingFormState>(() => toFormState(billing));
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isAdmin && !isTerminal && !billing.isFrozen;

  function updateField(field: keyof BillingFormState) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  const labor = Number(form.laborAmount);
  const additional = Number(form.additionalAmount);
  const discount = Number(form.discountAmount);
  const isValid =
    form.laborAmount.trim() !== "" &&
    !Number.isNaN(labor) &&
    labor >= 0 &&
    form.additionalAmount.trim() !== "" &&
    !Number.isNaN(additional) &&
    additional >= 0 &&
    form.discountAmount.trim() !== "" &&
    !Number.isNaN(discount) &&
    discount >= 0;

  // Vista previa en vivo mientras se edita: misma fórmula que el backend
  // (subtotal = mano de obra + repuestos + adicionales − descuento).
  const taxRatePercent = Number(billing.taxRate);
  const previewSubtotal = isValid ? labor + Number(partsTotal) + additional - discount : null;
  const previewTax = previewSubtotal !== null ? (previewSubtotal * taxRatePercent) / 100 : null;
  const previewTotal =
    previewSubtotal !== null && previewTax !== null ? previewSubtotal + previewTax : null;

  const displaySubtotal = canEdit && previewSubtotal !== null ? previewSubtotal : Number(billing.subtotal);
  const displayTax = canEdit && previewTax !== null ? previewTax : Number(billing.taxAmount);
  const displayTotal = canEdit && previewTotal !== null ? previewTotal : Number(billing.total);

  async function handleSave() {
    if (!isValid) return;

    setIsSaving(true);
    const result = await saveBillingAction(orderId, {
      laborAmount: labor,
      additionalAmount: additional,
      additionalDescription: form.additionalDescription.trim(),
      discountAmount: discount,
    });
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar la valorización");
      return;
    }

    toast.success("Valorización guardada");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Cierre económico</h3>
        {billing.isFrozen && (
          <span className="text-xs text-muted-foreground italic">
            Valores congelados al cierre
          </span>
        )}
      </div>

      {canEdit ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="laborAmount">Mano de obra</Label>
              <Input
                id="laborAmount"
                type="number"
                min={0}
                step="0.01"
                value={form.laborAmount}
                onChange={updateField("laborAmount")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discountAmount">Descuento</Label>
              <Input
                id="discountAmount"
                type="number"
                min={0}
                step="0.01"
                value={form.discountAmount}
                onChange={updateField("discountAmount")}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="additionalAmount">Otros cargos</Label>
              <Input
                id="additionalAmount"
                type="number"
                min={0}
                step="0.01"
                value={form.additionalAmount}
                onChange={updateField("additionalAmount")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="additionalDescription">Descripción</Label>
              <Input
                id="additionalDescription"
                value={form.additionalDescription}
                onChange={updateField("additionalDescription")}
                placeholder="Ej. Transporte"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <Row label="Mano de obra" value={formatCurrency(billing.laborAmount, currency)} />
          {Number(billing.additionalAmount) > 0 && (
            <Row
              label={billing.additionalDescription ?? "Otros cargos"}
              value={formatCurrency(billing.additionalAmount, currency)}
            />
          )}
          {Number(billing.discountAmount) > 0 && (
            <Row
              label="Descuento"
              value={`- ${formatCurrency(billing.discountAmount, currency)}`}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
        <Row label="Repuestos" value={formatCurrency(partsTotal, currency)} />
        <Row label="Subtotal" value={formatCurrency(displaySubtotal, currency)} />
        <Row
          label={`IVA (${canEdit ? taxRatePercent : Number(billing.taxRate)}%)`}
          value={formatCurrency(displayTax, currency)}
        />
        <div className="flex justify-between text-base font-semibold">
          <span>Total a cobrar</span>
          <span>{formatCurrency(displayTotal, currency)}</span>
        </div>
      </div>

      {canEdit && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !isValid}
          className="self-start"
        >
          {isSaving ? "Guardando..." : "Guardar valorización"}
        </Button>
      )}
    </div>
  );
}
