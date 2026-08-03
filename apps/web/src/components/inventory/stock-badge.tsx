import { cn } from "@/lib/utils";

interface StockBadgeProps {
  stock: number;
  minStock: number;
}

export function StockBadge({ stock, minStock }: StockBadgeProps) {
  const style =
    stock < minStock
      ? "bg-red-100 text-red-800"
      : stock === minStock
        ? "bg-amber-100 text-amber-800"
        : "bg-green-100 text-green-800";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
      )}
    >
      {stock} {stock === 1 ? "unidad" : "unidades"}
    </span>
  );
}
