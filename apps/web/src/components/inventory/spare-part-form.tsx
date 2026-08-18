"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SPARE_PART_CATEGORIES,
  SPARE_PART_CATEGORY_LABELS,
  type SparePartCategory,
} from "@/lib/spare-part-category";
import type { SparePart } from "@/lib/api/spare-parts";
import {
  createSparePartAction,
  updateSparePartAction,
} from "@/app/(dashboard)/inventario/actions";

interface SparePartFormState {
  sku: string;
  name: string;
  description: string;
  category: SparePartCategory;
  cost: string;
  salePrice: string;
  stock: string;
  minStock: string;
  trackStock: boolean;
}

const EMPTY_FORM: SparePartFormState = {
  sku: "",
  name: "",
  description: "",
  category: "REPUESTO",
  cost: "",
  salePrice: "",
  stock: "0",
  minStock: "0",
  trackStock: true,
};

function toFormState(part: SparePart): SparePartFormState {
  return {
    sku: part.sku,
    name: part.name,
    description: part.description ?? "",
    category: (part.category as SparePartCategory) ?? "REPUESTO",
    cost: part.cost ?? "",
    salePrice: part.salePrice,
    stock: String(part.stock),
    minStock: String(part.minStock),
    trackStock: part.trackStock,
  };
}

interface SparePartFormProps {
  mode: "create" | "edit";
  sparePartId?: string;
  initial?: SparePart;
}

export function SparePartForm({
  mode,
  sparePartId,
  initial,
}: SparePartFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<SparePartFormState>(() =>
    initial ? toFormState(initial) : EMPTY_FORM,
  );
  const [isSaving, setIsSaving] = useState(false);

  function updateField(field: keyof SparePartFormState) {
    return (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  const cost = Number(form.cost);
  const salePrice = Number(form.salePrice);
  const hasCostAndPrice =
    form.cost.trim() !== "" &&
    form.salePrice.trim() !== "" &&
    !Number.isNaN(cost) &&
    !Number.isNaN(salePrice);
  const margin =
    hasCostAndPrice && salePrice > 0
      ? ((salePrice - cost) / salePrice) * 100
      : null;
  const priceBelowCost = hasCostAndPrice && salePrice < cost;

  const stockValue = Number(form.stock);
  const minStockValue = Number(form.minStock);

  const isValid =
    form.sku.trim() !== "" &&
    form.name.trim() !== "" &&
    form.cost.trim() !== "" &&
    cost >= 0 &&
    form.salePrice.trim() !== "" &&
    salePrice >= 0 &&
    form.stock.trim() !== "" &&
    Number.isInteger(stockValue) &&
    stockValue >= 0 &&
    form.minStock.trim() !== "" &&
    Number.isInteger(minStockValue) &&
    minStockValue >= 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsSaving(true);
    const dto = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      cost,
      salePrice,
      stock: stockValue,
      minStock: minStockValue,
      trackStock: form.trackStock,
    };

    const result =
      mode === "create"
        ? await createSparePartAction(dto)
        : await updateSparePartAction(sparePartId!, dto);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo guardar el repuesto");
      return;
    }

    toast.success(
      mode === "create" ? "Repuesto creado" : "Repuesto actualizado",
    );
    router.push("/inventario");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos del repuesto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={updateField("sku")}
                placeholder="Ej. FIL-001"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Categoría</Label>
              <select
                id="category"
                value={form.category}
                onChange={updateField("category")}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground"
              >
                {SPARE_PART_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {SPARE_PART_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={updateField("name")}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descripción</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={updateField("description")}
              rows={3}
              className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios e inventario</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cost">Costo *</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                step="0.01"
                value={form.cost}
                onChange={updateField("cost")}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salePrice">Precio de venta *</Label>
              <Input
                id="salePrice"
                type="number"
                min={0}
                step="0.01"
                value={form.salePrice}
                onChange={updateField("salePrice")}
                required
              />
            </div>
          </div>

          {hasCostAndPrice && (
            <p
              className={
                priceBelowCost
                  ? "text-sm text-amber-700"
                  : "text-sm text-muted-foreground"
              }
            >
              Margen: {margin !== null ? `${margin.toFixed(1)}%` : "—"}
              {priceBelowCost &&
                " — el precio de venta es menor que el costo"}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-border p-3">
            <input
              id="trackStock"
              type="checkbox"
              className="mt-0.5"
              checked={!form.trackStock}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  trackStock: !event.target.checked,
                }))
              }
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="trackStock" className="font-normal">
                No gestionar existencias
              </Label>
              <p className="text-xs text-muted-foreground">
                Para equipos que se piden contra pedido y no se mantienen en
                bodega. No aparecerán en la alerta de existencias bajas y su
                stock no se moverá al usarlos en una orden.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                step="1"
                value={form.stock}
                onChange={updateField("stock")}
                disabled={!form.trackStock}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="minStock">Stock mínimo *</Label>
              <Input
                id="minStock"
                type="number"
                min={0}
                step="1"
                value={form.minStock}
                onChange={updateField("minStock")}
                disabled={!form.trackStock}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={!isValid || isSaving}
        className="w-full md:w-auto md:self-end"
      >
        {isSaving
          ? "Guardando..."
          : mode === "create"
            ? "Crear repuesto"
            : "Guardar cambios"}
      </Button>
    </form>
  );
}
