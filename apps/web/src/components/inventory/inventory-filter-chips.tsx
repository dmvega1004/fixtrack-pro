import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  SPARE_PART_CATEGORIES,
  SPARE_PART_CATEGORY_LABELS,
  type SparePartCategory,
} from "@/lib/spare-part-category";

interface InventoryFilterChipsProps {
  currentLowStock: boolean;
  currentCategory?: SparePartCategory;
  lowStockCount: number;
}

function chipClasses(active: boolean): string {
  return cn(
    "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors",
    active
      ? "bg-primary text-primary-foreground"
      : "bg-muted text-muted-foreground hover:text-foreground",
  );
}

export function InventoryFilterChips({
  currentLowStock,
  currentCategory,
  lowStockCount,
}: InventoryFilterChipsProps) {
  function hrefFor(lowStock: boolean, category?: SparePartCategory): string {
    const params = new URLSearchParams();
    if (lowStock) params.set("lowStock", "true");
    if (category) params.set("category", category);
    const query = params.toString();
    return query ? `/inventario?${query}` : "/inventario";
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefFor(false, currentCategory)}
          className={chipClasses(!currentLowStock)}
        >
          Todos
        </Link>
        <Link
          href={hrefFor(true, currentCategory)}
          className={chipClasses(currentLowStock)}
        >
          Stock bajo ({lowStockCount})
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={hrefFor(currentLowStock, undefined)}
          className={chipClasses(!currentCategory)}
        >
          Todas las categorías
        </Link>
        {SPARE_PART_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={hrefFor(currentLowStock, category)}
            className={chipClasses(currentCategory === category)}
          >
            {SPARE_PART_CATEGORY_LABELS[category]}
          </Link>
        ))}
      </div>
    </div>
  );
}
