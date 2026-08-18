import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { getSpareParts } from "@/lib/api/spare-parts";
import { getCompany } from "@/lib/api/company";
import { InventoryFilterChips } from "@/components/inventory/inventory-filter-chips";
import { InventoryCatalog } from "@/components/inventory/inventory-catalog";
import { EmptyInventoryState } from "@/components/inventory/empty-inventory-state";
import {
  SPARE_PART_CATEGORIES,
  type SparePartCategory,
} from "@/lib/spare-part-category";
import { needsRestock } from "@/lib/inventory/stock-status";

function parseCategory(value?: string): SparePartCategory | undefined {
  return value &&
    (SPARE_PART_CATEGORIES as readonly string[]).includes(value)
    ? (value as SparePartCategory)
    : undefined;
}

interface InventarioPageProps {
  searchParams: Promise<{ lowStock?: string; category?: string }>;
}

export default async function InventarioPage({
  searchParams,
}: InventarioPageProps) {
  const params = await searchParams;
  const lowStockOnly = params.lowStock === "true";
  const category = parseCategory(params.category);

  const [session, allParts, company] = await Promise.all([
    getSession(),
    getSpareParts(),
    getCompany(),
  ]);
  const isAdmin = session?.role === "ADMIN";

  // Derivado de la respuesta real, no del rol: si el backend redactó `cost`
  // para este usuario, ningún repuesto lo traerá.
  const showCost = allParts.some((part) => part.cost !== undefined);
  const lowStockCount = allParts.filter(needsRestock).length;

  let visibleParts = lowStockOnly
    ? allParts.filter(needsRestock)
    : allParts;
  if (category) {
    visibleParts = visibleParts.filter((part) => part.category === category);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Inventario</h1>
          <p className="text-sm text-muted-foreground">
            {allParts.length}{" "}
            {allParts.length === 1 ? "repuesto" : "repuestos"} ·{" "}
            {lowStockCount} en alerta
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/inventario/nuevo"
            className={buttonVariants({ variant: "default" })}
          >
            Nuevo repuesto
          </Link>
        )}
      </div>

      <InventoryFilterChips
        currentLowStock={lowStockOnly}
        currentCategory={category}
        lowStockCount={lowStockCount}
      />

      {allParts.length === 0 ? (
        <EmptyInventoryState isAdmin={isAdmin} />
      ) : (
        <InventoryCatalog
          parts={visibleParts}
          currency={company.currency}
          canEdit={isAdmin}
          showCost={showCost}
        />
      )}
    </div>
  );
}
