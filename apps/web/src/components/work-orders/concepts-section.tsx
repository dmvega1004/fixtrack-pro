"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format/currency";
import type { WorkOrderConceptLine } from "@/lib/api/work-order-parts";
import { saveConceptsAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import {
  WorkOrderItemEditor,
  type WorkOrderItemDraft,
} from "./work-order-item-editor";

interface ConceptsSectionProps {
  orderId: string;
  concepts: WorkOrderConceptLine[];
  currency: string;
  isAdmin: boolean;
  /** Cierre económico ya congelado (billing.isFrozen) — editable incluso con la orden cerrada. */
  isFrozen: boolean;
  isTerminal: boolean;
}

function toDrafts(concepts: WorkOrderConceptLine[]): WorkOrderItemDraft[] {
  return concepts.map((concept) => ({
    description: concept.description,
    quantity: concept.quantity,
    unitPrice: concept.unitPrice,
  }));
}

function lineTotal(concept: WorkOrderConceptLine): number {
  return Number(concept.quantity) * Number(concept.unitPrice);
}

/**
 * Bloque "Conceptos" (pestaña «Valores»): desglosa el cobro de la orden en
 * varias líneas con descripción propia, ADEMÁS de mano de obra/otros
 * cargos (que siguen existiendo para el caso simple). Visible para
 * ADMIN/COORDINATOR, editable solo por ADMIN — igual criterio RBAC que el
 * resto del cierre económico (BillingSection): el técnico no llega a ver
 * este componente porque WorkOrderPartsSummary.concepts viene omitido del
 * todo para su rol.
 */
export function ConceptsSection({
  orderId,
  concepts,
  currency,
  isAdmin,
  isFrozen,
  isTerminal,
}: ConceptsSectionProps) {
  const router = useRouter();
  const [items, setItems] = useState<WorkOrderItemDraft[]>(() => toDrafts(concepts));
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = isAdmin && (isFrozen || !isTerminal);

  const isValid = items.every((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    return (
      item.description.trim() !== "" &&
      Number.isFinite(quantity) &&
      quantity > 0 &&
      Number.isFinite(unitPrice) &&
      unitPrice >= 0
    );
  });

  async function handleSave() {
    if (!isValid) return;

    setIsSaving(true);
    const result = await saveConceptsAction(
      orderId,
      items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    );
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudieron guardar los conceptos");
      return;
    }

    toast.success("Conceptos guardados");
    router.refresh();
  }

  if (!canEdit && concepts.length === 0) {
    // Nada que mostrar en modo lectura y nada que editar: el bloque no
    // aporta — mismo criterio que el resto de "Valores" con datos vacíos.
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">Conceptos</h3>
        <p className="text-xs text-muted-foreground">
          Usa los conceptos cuando el cobro deba desglosarse. Para un trabajo
          sencillo, basta con la mano de obra.
        </p>
      </div>

      {canEdit ? (
        <WorkOrderItemEditor items={items} onChange={setItems} currency={currency} />
      ) : (
        <div className="flex flex-col gap-2 text-sm">
          {concepts.map((concept) => (
            <div key={concept.id} className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {concept.description} × {concept.quantity}
              </span>
              <span className="font-medium">
                {formatCurrency(lineTotal(concept), currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <Button
          onClick={() => void handleSave()}
          disabled={isSaving || !isValid}
          className="self-start"
          size="sm"
        >
          {isSaving ? "Guardando..." : "Guardar conceptos"}
        </Button>
      )}
    </div>
  );
}
