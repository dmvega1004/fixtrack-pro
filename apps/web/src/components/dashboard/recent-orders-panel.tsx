import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/shared/status-chip";
import { formatOrderNumber } from "@/lib/format/order-number";
import type { WorkOrder } from "@/lib/api/work-orders";

interface RecentOrdersPanelProps {
  orders: WorkOrder[];
}

export function RecentOrdersPanel({ orders }: RecentOrdersPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Actividad reciente</CardTitle>
        <Link href="/ordenes" className="text-xs font-medium text-primary">
          Ver todas →
        </Link>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">Aún no hay órdenes registradas.</p>
            <Link href="/ordenes/nueva" className="text-sm font-medium text-primary">
              Crear la primera orden →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/ordenes/${order.id}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{formatOrderNumber(order.orderNumber)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {order.equipment
                      ? `${order.equipment.brand} ${order.equipment.model} · ${order.client.name}`
                      : `${order.client.name} · Servicio locativo`}
                  </span>
                </div>
                <StatusChip status={order.status} />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
