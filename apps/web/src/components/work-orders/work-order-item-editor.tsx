"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format/currency";

export interface WorkOrderItemDraft {
  /** Como texto controlado (no number) para no pelear con el cursor mientras se escribe. */
  description: string;
  quantity: string;
  unitPrice: string;
}

export const EMPTY_WORK_ORDER_ITEM: WorkOrderItemDraft = {
  description: "",
  quantity: "1",
  unitPrice: "0",
};

interface WorkOrderItemEditorProps {
  items: WorkOrderItemDraft[];
  onChange: (items: WorkOrderItemDraft[]) => void;
  currency: string;
}

function lineTotal(item: WorkOrderItemDraft): number {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return quantity * unitPrice;
}

/**
 * Editor de conceptos de una orden: filas de TEXTO LIBRE (descripción,
 * cantidad, valor unitario) que se agregan y eliminan — mismo
 * comportamiento que QuoteItemEditor (cotizaciones), sin "Traer del
 * inventario": WorkOrderItem no lleva sparePartId (ver schema), porque un
 * concepto describe un trabajo (instalación, cableado, obra civil), no un
 * repuesto — el inventario ya tiene su propio bloque en esta misma pestaña.
 */
export function WorkOrderItemEditor({ items, onChange, currency }: WorkOrderItemEditorProps) {
  function updateItem(index: number, field: keyof WorkOrderItemDraft, value: string) {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  }

  function addBlankRow() {
    onChange([...items, { ...EMPTY_WORK_ORDER_ITEM }]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Todavía no hay conceptos. Agrega uno si necesitas desglosar el cobro.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`concept-description-${index}`}>Descripción</Label>
                  <Input
                    id={`concept-description-${index}`}
                    value={item.description}
                    onChange={(event) => updateItem(index, "description", event.target.value)}
                    placeholder="Ej. Instalación de brazos"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeRow(index)}
                  aria-label="Quitar concepto"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`concept-quantity-${index}`}>Cantidad</Label>
                  <Input
                    id={`concept-quantity-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`concept-unitPrice-${index}`}>Valor unitario</Label>
                  <Input
                    id={`concept-unitPrice-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                  <span className="text-xs text-muted-foreground">Total de la línea</span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(lineTotal(item), currency)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addBlankRow}>
          <Plus className="size-4" />
          Agregar concepto
        </Button>
        <span className="text-sm font-medium">
          Total conceptos: {formatCurrency(total, currency)}
        </span>
      </div>
    </div>
  );
}
