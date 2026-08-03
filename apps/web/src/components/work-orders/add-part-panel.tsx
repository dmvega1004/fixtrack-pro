"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SparePart } from "@/lib/api/spare-parts";
import { SPARE_PART_CATEGORY_LABELS } from "@/lib/spare-part-category";
import { addPartAction } from "@/app/(dashboard)/ordenes/[id]/actions";
import { ComboSelect } from "./combo-select";

interface AddPartPanelProps {
  orderId: string;
  catalog: SparePart[];
}

export function AddPartPanel({ orderId, catalog }: AddPartPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [sparePartId, setSparePartId] = useState<string | null>(
    catalog[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const comboItems = useMemo(
    () =>
      catalog.map((part) => ({
        id: part.id,
        label: part.name,
        hint: `${part.sku} · ${
          SPARE_PART_CATEGORY_LABELS[
            part.category as keyof typeof SPARE_PART_CATEGORY_LABELS
          ] ?? part.category
        } · Stock: ${part.stock}`,
      })),
    [catalog],
  );

  function handleQuantityChange(event: ChangeEvent<HTMLInputElement>) {
    setQuantity(Number(event.target.value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sparePartId) return;

    setIsSaving(true);
    const result = await addPartAction(orderId, sparePartId, quantity);
    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message ?? "No se pudo agregar el repuesto");
      return;
    }

    toast.success("Repuesto agregado");
    setIsOpen(false);
    setQuantity(1);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Agregar repuesto
      </Button>
    );
  }

  if (catalog.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        No hay repuestos en el catálogo.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sparePartId">Repuesto</Label>
        <ComboSelect
          items={comboItems}
          selectedId={sparePartId}
          onSelect={setSparePartId}
          placeholder="Buscar repuesto por nombre o SKU..."
          emptyMessage="No se encontraron repuestos."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quantity">Cantidad</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={handleQuantityChange}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Agregando..." : "Agregar"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
