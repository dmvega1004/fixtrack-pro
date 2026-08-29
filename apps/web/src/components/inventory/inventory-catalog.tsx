"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format/currency";
import type { SparePart } from "@/lib/api/spare-parts";
import { CategoryBadge } from "./category-badge";
import { StockBadge } from "./stock-badge";

interface InventoryCatalogProps {
  parts: SparePart[];
  currency: string;
  canEdit: boolean;
  /** Derivado de la respuesta del backend (no del rol): true si al menos un
   * repuesto trajo `cost`. La UI nunca decide esto por su cuenta. */
  showCost: boolean;
  /** Igual que showCost, pero para `salePrice` — redactado para TECHNICIAN. */
  showSalePrice: boolean;
}

function marginPercent(salePrice: number, cost: number): number | null {
  if (salePrice <= 0) return null;
  return ((salePrice - cost) / salePrice) * 100;
}

export function InventoryCatalog({
  parts,
  currency,
  canEdit,
  showCost,
  showSalePrice,
}: InventoryCatalogProps) {
  const [query, setQuery] = useState("");

  // Filtrado en memoria: el catálogo es pequeño. Si crece, esto debería
  // pasar a ser un parámetro de búsqueda (?q=) resuelto por el backend.
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return parts;
    return parts.filter(
      (part) =>
        part.name.toLowerCase().includes(normalized) ||
        part.sku.toLowerCase().includes(normalized),
    );
  }, [parts, query]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por nombre o SKU..."
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No se encontraron repuestos con estos filtros
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Repuesto</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  {showSalePrice && (
                    <th className="px-4 py-3 font-medium">Precio venta</th>
                  )}
                  {showCost && (
                    <th className="px-4 py-3 font-medium">Costo</th>
                  )}
                  {showCost && (
                    <th className="px-4 py-3 font-medium">Margen %</th>
                  )}
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((part) => {
                  const cost =
                    part.cost !== undefined ? Number(part.cost) : undefined;
                  const margin =
                    cost !== undefined && part.salePrice !== undefined
                      ? marginPercent(Number(part.salePrice), cost)
                      : undefined;

                  return (
                    <tr key={part.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {part.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{part.name}</span>
                          <CategoryBadge category={part.category} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StockBadge
                          stock={part.stock}
                          minStock={part.minStock}
                          trackStock={part.trackStock}
                        />
                      </td>
                      {showSalePrice && (
                        <td className="px-4 py-3">
                          {formatCurrency(part.salePrice!, currency)}
                        </td>
                      )}
                      {showCost && (
                        <td className="px-4 py-3">
                          {cost !== undefined
                            ? formatCurrency(cost, currency)
                            : "—"}
                        </td>
                      )}
                      {showCost && (
                        <td className="px-4 py-3">
                          {margin !== undefined && margin !== null
                            ? `${margin.toFixed(1)}%`
                            : "—"}
                        </td>
                      )}
                      {canEdit && (
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/inventario/${part.id}/editar`}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            Editar
                          </Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((part) => {
              const cost =
                part.cost !== undefined ? Number(part.cost) : undefined;
              const margin =
                cost !== undefined && part.salePrice !== undefined
                  ? marginPercent(Number(part.salePrice), cost)
                  : undefined;

              return (
                <div
                  key={part.id}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{part.name}</span>
                      <span className="text-xs text-muted-foreground">
                        SKU {part.sku}
                      </span>
                    </div>
                    <StockBadge
                      stock={part.stock}
                      minStock={part.minStock}
                      trackStock={part.trackStock}
                    />
                  </div>
                  <CategoryBadge category={part.category} />
                  <div className="flex flex-col gap-1 text-sm">
                    {showSalePrice && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Precio venta
                        </span>
                        <span>{formatCurrency(part.salePrice!, currency)}</span>
                      </div>
                    )}
                    {showCost && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Costo</span>
                        <span>
                          {cost !== undefined
                            ? formatCurrency(cost, currency)
                            : "—"}
                        </span>
                      </div>
                    )}
                    {showCost && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Margen</span>
                        <span>
                          {margin !== undefined && margin !== null
                            ? `${margin.toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <Link
                      href={`/inventario/${part.id}/editar`}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      Editar
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
