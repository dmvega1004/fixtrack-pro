"use client";

import { useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComboSelect } from "@/components/work-orders/combo-select";
import type { SparePart } from "@/lib/api/spare-parts";
import { formatCurrency } from "@/lib/format/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface QuoteItemDraft {
  description: string;
  /** Como texto controlado (no number) para no pelear con el cursor mientras se escribe. */
  quantity: string;
  unitPrice: string;
  sparePartId?: string;
}

export const EMPTY_QUOTE_ITEM: QuoteItemDraft = {
  description: "",
  quantity: "1",
  unitPrice: "0",
};

interface QuoteItemEditorProps {
  items: QuoteItemDraft[];
  onChange: (items: QuoteItemDraft[]) => void;
  spareParts: SparePart[];
  currency: string;
}

function lineTotal(item: QuoteItemDraft): number {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return 0;
  return quantity * unitPrice;
}

/**
 * Editor de ítems de una cotización: filas de TEXTO LIBRE (descripción,
 * cantidad, valor unitario) que se agregan y eliminan. "Traer del
 * inventario" solo prellena una fila nueva desde el catálogo — sparePartId
 * queda como referencia, pero el texto sigue siendo editable después y
 * NUNCA se descuenta stock (una cotización no mueve inventario).
 */
export function QuoteItemEditor({ items, onChange, spareParts, currency }: QuoteItemEditorProps) {
  const [isPickingFromInventory, setIsPickingFromInventory] = useState(false);
  const [pickedSparePartId, setPickedSparePartId] = useState<string | null>(null);

  const sparePartComboItems = useMemo(
    () =>
      spareParts.map((part) => ({
        id: part.id,
        label: part.name,
        hint: `${part.sku} · ${formatCurrency(part.salePrice, currency)}`,
      })),
    [spareParts, currency],
  );

  function updateItem(index: number, field: keyof QuoteItemDraft, value: string) {
    const next = items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  }

  function addBlankRow() {
    onChange([...items, { ...EMPTY_QUOTE_ITEM }]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function confirmAddFromInventory() {
    const part = spareParts.find((p) => p.id === pickedSparePartId);
    if (!part) return;
    onChange([
      ...items,
      {
        description: part.name,
        quantity: "1",
        unitPrice: part.salePrice,
        sparePartId: part.id,
      },
    ]);
    setIsPickingFromInventory(false);
    setPickedSparePartId(null);
  }

  const total = items.reduce((sum, item) => sum + lineTotal(item), 0);

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Todavía no hay ítems. Agrega uno o tráelo del inventario.
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
                  <Label htmlFor={`item-description-${index}`}>Descripción</Label>
                  <Input
                    id={`item-description-${index}`}
                    value={item.description}
                    onChange={(event) => updateItem(index, "description", event.target.value)}
                    placeholder="Ej. Motor trifásico 5HP, instalación incluida"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="mt-6 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeRow(index)}
                  aria-label="Quitar ítem"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`item-quantity-${index}`}>Cantidad</Label>
                  <Input
                    id={`item-quantity-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, "quantity", event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`item-unitPrice-${index}`}>Valor unitario</Label>
                  <Input
                    id={`item-unitPrice-${index}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                  <span className="text-xs text-muted-foreground">Subtotal de la fila</span>
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addBlankRow}>
            <Plus className="size-4" />
            Agregar ítem
          </Button>
          {spareParts.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPickingFromInventory(true)}
            >
              <Package className="size-4" />
              Traer del inventario
            </Button>
          )}
        </div>
        <span className="text-sm font-medium">
          Total ítems: {formatCurrency(total, currency)}
        </span>
      </div>

      <Dialog
        open={isPickingFromInventory}
        onOpenChange={(next) => {
          setIsPickingFromInventory(next);
          if (!next) setPickedSparePartId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Traer del inventario</DialogTitle>
            <DialogDescription>
              Prellena una fila nueva con la descripción y el precio de venta —
              después sigue siendo texto editable. No descuenta stock.
            </DialogDescription>
          </DialogHeader>

          <ComboSelect
            items={sparePartComboItems}
            selectedId={pickedSparePartId}
            onSelect={setPickedSparePartId}
            placeholder="Buscar repuesto por nombre o SKU..."
            emptyMessage="No se encontraron repuestos."
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPickingFromInventory(false);
                setPickedSparePartId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={confirmAddFromInventory} disabled={!pickedSparePartId}>
              Agregar fila
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
