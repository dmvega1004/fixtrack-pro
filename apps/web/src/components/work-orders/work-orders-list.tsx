import Link from "next/link";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatDate } from "@/lib/format/dates";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { WorkOrderCard } from "./work-order-card";
import type { WorkOrder } from "@/lib/api/work-orders";

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
                  <Link href={href} className="flex flex-col px-4 py-3">
                    <span className="font-medium">
                      {formatOrderNumber(order.orderNumber)}
                    </span>
                    {order.collectionNumber !== null && (
                      <span className="text-xs text-muted-foreground">
                        {formatCollectionNumber(order.collectionNumber)}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="flex flex-col px-4 py-3">
                    {order.equipments.length === 0 ? (
                      <>
                        <span>{order.client.name}</span>
                        <span className="text-xs text-muted-foreground">
                          Servicio locativo
                        </span>
                      </>
                    ) : order.equipments.length === 1 ? (
                      <>
                        <span>
                          {order.equipments[0].brand} {order.equipments[0].model}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {order.client.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{order.equipments.length} equipos</span>
                        <span className="text-xs text-muted-foreground">
                          {order.client.name}
                        </span>
                      </>
                    )}
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
          <WorkOrderCard key={order.id} order={order} />
        ))}
      </div>
    </>
  );
}
