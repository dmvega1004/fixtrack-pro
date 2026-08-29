import Link from "next/link";
import { StatusChip } from "@/components/shared/status-chip";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { formatDateCompact } from "@/lib/format/dates";
import { formatOrderNumber } from "@/lib/format/order-number";
import { formatCollectionNumber } from "@/lib/format/collection-number";
import { WorkOrderCard } from "./work-order-card";
import type { WorkOrder } from "@/lib/api/work-orders";

interface WorkOrdersListProps {
  workOrders: WorkOrder[];
}

/** "Equipo · Cliente" de una fila: equipo(s) + cliente, con su title propio para el truncate. */
function equipmentClientLines(order: WorkOrder): { primary: string; secondary: string } {
  if (order.equipments.length === 0) {
    return { primary: order.client.name, secondary: "Servicio locativo" };
  }
  if (order.equipments.length === 1) {
    return {
      primary: `${order.equipments[0].brand} ${order.equipments[0].model}`,
      secondary: order.client.name,
    };
  }
  return { primary: `${order.equipments.length} equipos`, secondary: order.client.name };
}

export function WorkOrdersList({ workOrders }: WorkOrdersListProps) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="w-full table-fixed text-left text-sm">
        <thead className="border-b border-border text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-28 px-4 py-3 font-medium">Orden</th>
            <th className="px-4 py-3 font-medium">Equipo · Cliente</th>
            <th className="w-32 px-4 py-3 font-medium">Técnico asignado</th>
            <th className="w-24 px-4 py-3 font-medium">Prioridad</th>
            <th className="w-28 px-4 py-3 font-medium">Estado</th>
            <th className="w-24 px-4 py-3 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {workOrders.map((order) => {
            const href = `/ordenes/${order.id}`;
            const { primary, secondary } = equipmentClientLines(order);
            return (
              <tr key={order.id} className="hover:bg-muted/50">
                <td className="p-0">
                  <Link href={href} className="flex flex-col px-4 py-3">
                    <span className="whitespace-nowrap font-medium">
                      {formatOrderNumber(order.orderNumber)}
                    </span>
                    {order.collectionNumber != null && (
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatCollectionNumber(order.collectionNumber)}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="flex flex-col px-4 py-3">
                    <span className="truncate" title={primary}>
                      {primary}
                    </span>
                    <span className="truncate text-xs text-muted-foreground" title={secondary}>
                      {secondary}
                    </span>
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="block truncate px-4 py-3" title={order.user?.name}>
                    {order.user ? (
                      order.user.name
                    ) : (
                      <span className="italic text-amber-600">Sin asignar</span>
                    )}
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="block px-4 py-3 whitespace-nowrap">
                    <PriorityBadge priority={order.priority} />
                  </Link>
                </td>
                <td className="p-0">
                  <Link href={href} className="block px-4 py-3 whitespace-nowrap">
                    <StatusChip status={order.status} />
                  </Link>
                </td>
                <td className="p-0">
                  <Link
                    href={href}
                    className="block whitespace-nowrap px-4 py-3 text-muted-foreground"
                  >
                    {formatDateCompact(order.createdAt)}
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
