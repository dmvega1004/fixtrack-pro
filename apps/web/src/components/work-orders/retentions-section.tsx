"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format/currency";
import type { WorkOrderBilling } from "@/lib/api/work-order-parts";
import type { Retention } from "@/lib/api/retentions";
import { saveRetentionsAction } from "@/app/(dashboard)/ordenes/[id]/actions";

interface RetentionsSectionProps {
  orderId: string;
  billing: WorkOrderBilling;
  /** Catálogo de la empresa — vacío si el rol no es ADMIN (ver ordenes/[id]/page.tsx). */
  retentionCatalog: Retention[];
  isAdmin: boolean;
  isTerminal: boolean;
  currency: string;
}

/**
 * Bloque "Retenciones" (pestaña «Valores»): casillas con el catálogo de la
 * empresa, premarcadas según el cliente en órdenes nuevas (ver
 * WorkOrdersService.create) y modificables acá. Debajo, el desglose
 * calculado y el neto a recibir. Igual criterio RBAC estricto que
 * BillingSection para EDITAR (solo ADMIN, ni Coordinador) — pero a
 * diferencia del resto del cierre económico, VER el desglose sí es visible
 * para Coordinador (billing.retentions/netAmount ya vienen sin redactar
 * para ese rol, ver WorkOrdersService.toView): la cuenta de cobro que
 * también genera/ve Coordinador tiene que poder mostrarlo.
 */
export function RetentionsSection({
  orderId,
  billing,
  retentionCatalog,
  isAdmin,
  isTerminal,
  currency,
}: RetentionsSectionProps) {
  const router = useRouter();
  const savedIds = (billing.retentions ?? []).map((r) => r.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(savedIds);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isAdmin && (billing.isFrozen || !isTerminal);
  const hasRetentions = (billing.retentions?.length ?? 0) > 0;

  // Una retención desactivada no se ofrece para marcarla de nuevo, pero si
  // esta orden ya la tenía marcada sigue apareciendo (igual criterio que
  // la ficha del cliente).
  const availableRetentions = retentionCatalog.filter(
    (r) => r.active || savedIds.includes(r.id),
  );

  if (availableRetentions.length === 0 && !hasRetentions) {
    // Nada que ofrecer y nada aplicado: el bloque no aporta — mismo
    // criterio que ConceptsSection con datos vacíos.
    return null;
  }

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((r) => r !== id) : [...current, id],
    );
  }

  const isDirty =
    selectedIds.length !== savedIds.length ||
    !selectedIds.every((id) => savedIds.includes(id));

  async function handleSave() {
    setIsSaving(true);
    const result = await saveRetentionsAction(orderId, selectedIds);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron guardar las retenciones");
      return;
    }

    toast.success("Retenciones guardadas");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Retenciones</h3>
        <p className="text-xs text-muted-foreground">
          Lo que el cliente retiene y consigna menos al pagar (retefuente,
          ReteICA...).
        </p>
      </div>

      {canEdit && availableRetentions.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {availableRetentions.map((retention) => (
              <div
                key={retention.id}
                className="flex items-start gap-2 rounded-lg border border-border p-3"
              >
                <input
                  id={`order-retention-${retention.id}`}
                  type="checkbox"
                  className="mt-0.5"
                  checked={selectedIds.includes(retention.id)}
                  onChange={() => toggle(retention.id)}
                />
                <Label
                  htmlFor={`order-retention-${retention.id}`}
                  className="flex-1 font-normal"
                >
                  {retention.name}{" "}
                  <span className="text-muted-foreground">
                    ({Number(retention.rate)}%)
                    {!retention.active && " · desactivada"}
                  </span>
                </Label>
              </div>
            ))}
          </div>

          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || !isDirty}
            className="self-start"
            size="sm"
          >
            {isSaving ? "Guardando..." : "Guardar retenciones"}
          </Button>
        </>
      )}

      {hasRetentions && (
        <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
          {billing.retentions!.map((retention) => (
            <div key={retention.id} className="flex justify-between text-muted-foreground">
              <span>
                − {retention.name} ({Number(retention.rate)}%)
              </span>
              <span className="text-foreground">
                − {formatCurrency(retention.amount, currency)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-base font-semibold">
            <span>Neto a recibir</span>
            <span>{formatCurrency(billing.netAmount ?? billing.total, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
