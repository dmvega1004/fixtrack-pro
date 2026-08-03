import { cn } from "@/lib/utils";
import {
  SPARE_PART_CATEGORY_LABELS,
  type SparePartCategory,
} from "@/lib/spare-part-category";

const CATEGORY_STYLES: Record<SparePartCategory, string> = {
  REPUESTO: "bg-blue-100 text-blue-800",
  EQUIPO: "bg-purple-100 text-purple-800",
  MATERIAL: "bg-slate-100 text-slate-800",
  CONSUMIBLE: "bg-teal-100 text-teal-800",
};

interface CategoryBadgeProps {
  category: string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const label =
    SPARE_PART_CATEGORY_LABELS[category as SparePartCategory] ?? category;
  const style =
    CATEGORY_STYLES[category as SparePartCategory] ??
    "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
      )}
    >
      {label}
    </span>
  );
}
