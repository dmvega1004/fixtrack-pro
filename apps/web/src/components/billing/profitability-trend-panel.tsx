import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format/currency";
import { marginTone, type MarginTone } from "@/lib/format/margin";
import type { ProfitabilityMonthPoint } from "@/lib/api/profitability";

const TONE_BAR: Record<MarginTone, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  neutral: "bg-muted-foreground/30",
};

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat("es-CO", { month: "short" });

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return MONTH_LABEL_FORMATTER.format(new Date(year, monthNumber - 1, 1));
}

interface ProfitabilityTrendPanelProps {
  points: ProfitabilityMonthPoint[];
  currency: string;
}

/** Tendencia de margen bruto de los últimos 12 meses calendario — barras CSS, sin librería de gráficos. */
export function ProfitabilityTrendPanel({ points, currency }: ProfitabilityTrendPanelProps) {
  const maxIncome = Math.max(1, ...points.map((p) => Number(p.income)));

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Tendencia (últimos 12 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 overflow-x-auto pb-2">
          {points.map((point) => {
            const heightPercent = Math.max(4, (Number(point.income) / maxIncome) * 100);
            const marginHeightPercent =
              Number(point.margin) > 0
                ? Math.max(2, (Number(point.margin) / maxIncome) * 100)
                : 0;
            return (
              <div key={point.month} className="flex w-12 shrink-0 flex-col items-center gap-1">
                <div
                  className="relative flex h-28 w-6 items-end rounded-sm bg-muted"
                  title={`Ingreso ${formatCurrency(point.income, currency)} · Margen ${formatCurrency(point.margin, currency)}`}
                >
                  <div
                    className="w-full rounded-sm bg-muted-foreground/20"
                    style={{ height: `${heightPercent}%` }}
                  />
                  <div
                    className={`absolute bottom-0 w-full rounded-sm ${TONE_BAR[marginTone(point.marginPercent)]}`}
                    style={{ height: `${marginHeightPercent}%` }}
                  />
                </div>
                <span className="text-[10px] whitespace-nowrap text-muted-foreground uppercase">
                  {monthLabel(point.month)}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
