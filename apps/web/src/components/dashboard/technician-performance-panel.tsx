import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TechnicianRankingEntry } from "@/lib/dashboard/summary";

interface TechnicianPerformancePanelProps {
  ranking: TechnicianRankingEntry[];
  avgResolutionDays: number | null;
}

export function TechnicianPerformancePanel({
  ranking,
  avgResolutionDays,
}: TechnicianPerformancePanelProps) {
  const max = Math.max(1, ...ranking.map((entry) => entry.closedCount));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por técnico (30 días)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay técnicos registrados para mostrar su rendimiento.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              {ranking.map((entry) => (
                <div key={entry.userId} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm" title={entry.name}>
                    {entry.name}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(entry.closedCount / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">
                    {entry.closedCount}
                  </span>
                </div>
              ))}
            </div>
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Promedio de resolución:{" "}
              {avgResolutionDays !== null
                ? `${avgResolutionDays.toFixed(1)} días`
                : "sin datos suficientes"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
