import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";
import type { ProfitabilityClient } from "@/lib/api/profitability";
import { MarginChip } from "./margin-chip";

interface ProfitabilityByClientTableProps {
  items: ProfitabilityClient[];
  currency: string;
}

/** Margen por cliente del período, de mayor a menor (ya viene ordenado del backend). */
export function ProfitabilityByClientTable({ items, currency }: ProfitabilityByClientTableProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Margen por cliente</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en este período.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li
                key={item.clientId}
                className="flex items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{item.clientName}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums">{formatCurrency(item.margin, currency)}</span>
                  <MarginChip marginPercent={item.marginPercent} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
