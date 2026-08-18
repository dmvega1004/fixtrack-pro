import { cn } from "@/lib/utils";
import { isLowStock } from "@/lib/inventory/stock-status";

interface StockBadgeProps {
  stock: number;
  minStock: number;
  /** false = se pide contra pedido: no se muestra alerta de stock. */
  trackStock: boolean;
}

export function StockBadge({ stock, minStock, trackStock }: StockBadgeProps) {
  if (!trackStock) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Contra pedido
      </span>
    );
  }

  // Punto de reorden: stock <= minStock (ver isLowStock). Dentro de la
  // alerta, rojo es más urgente (ya por debajo) que ámbar (justo en el mínimo).
  const style = !isLowStock(stock, minStock)
    ? "bg-green-100 text-green-800"
    : stock < minStock
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";

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
