import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SparePart } from "@/lib/api/spare-parts";

interface InventoryAlertsPanelProps {
  items: SparePart[];
}

export function InventoryAlertsPanel({ items }: InventoryAlertsPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Alertas de inventario</CardTitle>
        <Link href="/inventario?lowStock=true" className="text-xs font-medium text-primary">
          Ver todos →
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin alertas de stock por ahora.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((part) => {
              const critical = part.stock < part.minStock;
              return (
                <Link
                  key={part.id}
                  href="/inventario?lowStock=true"
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
                >
                  <span className="truncate text-sm font-medium">{part.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium",
                      critical ? "text-red-600" : "text-amber-600",
                    )}
                  >
                    {part.stock} / mín {part.minStock}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
