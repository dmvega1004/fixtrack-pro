import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusFilterChips } from "@/components/work-orders/status-filter-chips";
import { PriorityFilterSelect } from "@/components/work-orders/priority-filter-select";
import { WorkOrdersList } from "@/components/work-orders/work-orders-list";
import { EmptyOrdersState } from "@/components/work-orders/empty-orders-state";
import { getWorkOrders } from "@/lib/api/work-orders";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/components/shared/status-chip";
import { PRIORITY_LABELS, type Priority } from "@/components/shared/priority-badge";

function parseStatus(value?: string): OrderStatus | undefined {
  return value && value in ORDER_STATUS_LABELS
    ? (value as OrderStatus)
    : undefined;
}

function parsePriority(value?: string): Priority | undefined {
  return value && value in PRIORITY_LABELS ? (value as Priority) : undefined;
}

interface OrdenesPageProps {
  searchParams: Promise<{ status?: string; priority?: string; unassigned?: string }>;
}

export default async function OrdenesPage({ searchParams }: OrdenesPageProps) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const priority = parsePriority(params.priority);
  // Sin soporte en el backend para filtrar por "sin asignar": se aplica acá
  // igual que priority, después del fetch. Enlazado desde el KPI de la home.
  const unassignedOnly = params.unassigned === "true";

  let workOrders = await getWorkOrders({ status, priority });
  if (unassignedOnly) {
    workOrders = workOrders.filter((order) => order.user === null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Órdenes de trabajo</h1>
          <p className="text-sm text-muted-foreground">
            {workOrders.length}{" "}
            {workOrders.length === 1 ? "resultado" : "resultados"}
            {unassignedOnly && " · sin asignar"}
          </p>
        </div>
        <Link
          href="/ordenes/nueva"
          className={buttonVariants({ variant: "default" })}
        >
          Nueva orden
        </Link>
      </div>

      {unassignedOnly && (
        <p className="text-sm text-muted-foreground">
          Mostrando solo órdenes sin técnico asignado ·{" "}
          <Link href="/ordenes" className="font-medium text-primary">
            Quitar filtro
          </Link>
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilterChips currentStatus={status} currentPriority={params.priority} />
        <PriorityFilterSelect />
      </div>

      {workOrders.length === 0 ? (
        <EmptyOrdersState />
      ) : (
        <WorkOrdersList workOrders={workOrders} />
      )}
    </div>
  );
}
