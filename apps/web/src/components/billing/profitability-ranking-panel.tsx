import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";
import { formatOrderNumber } from "@/lib/format/order-number";
import type { ProfitabilityOrder } from "@/lib/api/profitability";
import { MarginChip } from "./margin-chip";

const RANKING_SIZE = 5;

interface ProfitabilityRankingPanelProps {
  orders: ProfitabilityOrder[];
  currency: string;
}

function RankingList({ title, items, currency }: { title: string; items: ProfitabilityOrder[]; currency: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en este período.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.orderId}>
                <Link
                  href={`/ordenes/${item.orderId}`}
                  className="flex items-center justify-between gap-2 py-2 text-sm hover:text-foreground"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{formatOrderNumber(item.orderNumber)}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.clientName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums">{formatCurrency(item.margin, currency)}</span>
                    <MarginChip marginPercent={item.marginPercent} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** Ranking corto: 5 trabajos de mayor margen y 5 de menor — derivado del mismo listado de órdenes del período, no un endpoint aparte. */
export function ProfitabilityRankingPanel({ orders, currency }: ProfitabilityRankingPanelProps) {
  const byMarginDesc = [...orders].sort((a, b) => Number(b.margin) - Number(a.margin));
  const top = byMarginDesc.slice(0, RANKING_SIZE);
  const bottom = byMarginDesc.slice(-RANKING_SIZE).reverse();

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <RankingList title="Mayor margen" items={top} currency={currency} />
      <RankingList title="Menor margen" items={bottom} currency={currency} />
    </div>
  );
}
