import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/components/shared/status-chip";
import { cn } from "@/lib/utils";
import type { StatusCount } from "@/lib/dashboard/summary";

// Mismas familias de color que StatusChip (bg-*-100/text-*-800), en tono
// sólido para que sirvan de punto/barra en vez de fondo de badge.
const STATUS_SOLID_COLOR: Record<OrderStatus, string> = {
  PENDING: "bg-amber-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  DELIVERED: "bg-indigo-500",
  CANCELLED: "bg-red-500",
};

interface OrdersByStatusPanelProps {
  statusCounts: StatusCount[];
}

export function OrdersByStatusPanel({ statusCounts }: OrdersByStatusPanelProps) {
  const total = statusCounts.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Órdenes por estado</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay órdenes registradas.</p>
        ) : (
          <>
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              {statusCounts
                .filter((entry) => entry.count > 0)
                .map((entry) => (
                  <div
                    key={entry.status}
                    className={STATUS_SOLID_COLOR[entry.status]}
                    style={{ width: `${(entry.count / total) * 100}%` }}
                  />
                ))}
            </div>
            <ul className="flex flex-col gap-2">
              {statusCounts.map((entry) => (
                <li key={entry.status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn("size-2 shrink-0 rounded-full", STATUS_SOLID_COLOR[entry.status])}
                    />
                    {ORDER_STATUS_LABELS[entry.status]}
                  </span>
                  <span className="text-muted-foreground">{entry.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
