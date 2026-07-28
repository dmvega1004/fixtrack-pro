import Link from "next/link";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge, type Priority } from "@/components/shared/priority-badge";
import { formatDate } from "@/lib/format/dates";
import { formatOrderNumber } from "@/lib/format/order-number";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/lib/api/work-orders";

const PRIORITY_BORDER: Record<Priority, string> = {
  HIGH: "border-l-4 border-red-500",
  MEDIUM: "border-l-4 border-amber-500",
  LOW: "border-l-4 border-gray-300",
};

interface WorkOrdersListProps {
  workOrders: WorkOrder[];
}

export function WorkOrdersList({ workOrders }: WorkOrdersListProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Orden</th>
            <th className="px-4 py-3 font-medium">Equipo · Cliente</th>
            <th className="px-4 py-3 font-medium">Técnico asignado</th>
            <th className="px-4 py-3 font-medium">Prioridad</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {workOrders.map((order) => {
            const href = `/ordenes/${order.id}`;
            return (
              <tr key={order.id} className="hover:bg-muted/50">
                <td className="p-0">
                  <Link href={href} className="block px-4 py-3 font-medium">
                    {formatOrderNumber(order.orderNumber)}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="flex flex-col px-4 py-3">
                    <span>
                      {order.equipment.brand} {order.equipment.model}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.equipment.client.name}
                    </span>
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="block px-4 py-3">
                    {order.user ? (
                      order.user.name
                    ) : (
                      <span className="italic text-amber-600">Sin asignar</span>
                    )}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="block px-4 py-3">
                    <PriorityBadge priority={order.priority} />
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="block px-4 py-3">
                    <StatusChip status={order.status} />
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={href}
                    className="block px-4 py-3 text-muted-foreground"
                  >
                    {formatDate(order.createdAt)}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {workOrders.map((order) => (
          <Link
            key={order.id}
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
            <span className="text-sm font-medium">
              {order.equipment.brand} {order.equipment.model}
            </span>
            <span className="text-sm text-muted-foreground">
              {order.equipment.client.name}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
