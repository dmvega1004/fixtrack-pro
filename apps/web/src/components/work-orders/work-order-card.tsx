import Link from "next/link";
import { StatusChip } from "@/components/shared/status-chip";
import { type Priority } from "@/components/shared/priority-badge";
import { formatOrderNumber } from "@/lib/format/order-number";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/lib/api/work-orders";

export const PRIORITY_BORDER: Record<Priority, string> = {
  HIGH: "border-l-4 border-red-500",
  MEDIUM: "border-l-4 border-amber-500",
  LOW: "border-l-4 border-gray-300",
};

interface WorkOrderCardProps {
  order: WorkOrder;
}

/** Card con borde de prioridad — usada en el listado móvil de /ordenes y en la home del técnico. */
export function WorkOrderCard({ order }: WorkOrderCardProps) {
  return (
    <Link
      href={`/ordenes/${order.id}`}
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-sm",
        PRIORITY_BORDER[order.priority],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-blue-600">
          {formatOrderNumber(order.orderNumber)}
        </span>
        <StatusChip status={order.status} />
      </div>
      {order.equipment ? (
        <>
          <span className="text-sm font-medium">
            {order.equipment.brand} {order.equipment.model}
          </span>
          <span className="text-sm text-muted-foreground">
            {order.client.name}
          </span>
        </>
      ) : (
        <>
          <span className="text-sm font-medium">{order.client.name}</span>
          <span className="text-sm text-muted-foreground">
            Servicio locativo
          </span>
        </>
      )}
    </Link>
  );
}
