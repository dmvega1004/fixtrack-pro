import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusFilterChips } from "@/components/work-orders/status-filter-chips";
import { PriorityFilterSelect } from "@/components/work-orders/priority-filter-select";
import { OrdersSearchInput } from "@/components/work-orders/orders-search-input";
import { WorkOrdersList } from "@/components/work-orders/work-orders-list";
import { OrdersListWithLoadMore } from "@/components/work-orders/orders-list-with-load-more";
import { EmptyOrdersState } from "@/components/work-orders/empty-orders-state";
import { EmptySearchState } from "@/components/work-orders/empty-search-state";
import { getWorkOrders, getWorkOrdersCount } from "@/lib/api/work-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/work-orders-pagination";
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
  searchParams: Promise<{
    status?: string;
    priority?: string;
    unassigned?: string;
    q?: string;
    equipmentId?: string;
  }>;
}

export default async function OrdenesPage({ searchParams }: OrdenesPageProps) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const priority = parsePriority(params.priority);
  const search = params.q?.trim() || undefined;
  // Sin soporte en el backend para filtrar por "sin asignar": se aplica acá
  // igual que priority, después del fetch. Enlazado desde el KPI de la home.
  const unassignedOnly = params.unassigned === "true";
  // Enlazado desde "Ver todas las órdenes de este equipo" (ficha de equipo,
  // vista móvil del historial) — filtro exacto por id, no por el buscador
  // de texto (que no cubre marca/modelo/serial).
  const equipmentId = params.equipmentId?.trim() || undefined;

  // Enlace de "Limpiar búsqueda": conserva status/priority/unassigned/equipmentId, quita `q`.
  const clearSearchParams = new URLSearchParams();
  if (params.status) clearSearchParams.set("status", params.status);
  if (params.priority) clearSearchParams.set("priority", params.priority);
  if (params.unassigned) clearSearchParams.set("unassigned", params.unassigned);
  if (equipmentId) clearSearchParams.set("equipmentId", equipmentId);
  const clearSearchQuery = clearSearchParams.toString();
  const clearSearchHref = clearSearchQuery
    ? `/ordenes?${clearSearchQuery}`
    : "/ordenes";

  // "Sin asignar" es un recorte angosto (enlazado desde el KPI de la home,
  // siempre activas): se sigue trayendo completo, sin paginar. El listado
  // normal sí puede crecer sin techo, así que pagina con "Cargar más" —
  // total real vía GET /work-orders/count, primera página vía GET
  // /work-orders?take=&skip=0 (antes se traía todo en una sola llamada).
  let workOrders;
  let total: number;
  if (unassignedOnly) {
    workOrders = (
      await getWorkOrders({ status, priority, search, equipmentId })
    ).filter((order) => order.user === null);
    total = workOrders.length;
  } else {
    [workOrders, total] = await Promise.all([
      getWorkOrders({ status, priority, search, equipmentId, take: ORDERS_PAGE_SIZE, skip: 0 }),
      getWorkOrdersCount({ status, priority, search, equipmentId }),
    ]);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Órdenes de trabajo</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "resultado" : "resultados"}
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

      {equipmentId && (
        <p className="text-sm text-muted-foreground">
          Mostrando solo órdenes de este equipo ·{" "}
          <Link href="/ordenes" className="font-medium text-primary">
            Quitar filtro
          </Link>
        </p>
      )}

      <OrdersSearchInput key={search ?? ""} initialValue={search ?? ""} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusFilterChips
          currentStatus={status}
          currentPriority={params.priority}
          currentSearch={search}
        />
        <PriorityFilterSelect />
      </div>

      {unassignedOnly ? (
        workOrders.length === 0 ? (
          search ? (
            <EmptySearchState term={search} clearHref={clearSearchHref} />
          ) : (
            <EmptyOrdersState />
          )
        ) : (
          <WorkOrdersList workOrders={workOrders} />
        )
      ) : (
        <OrdersListWithLoadMore
          // Nueva combinación de filtros (incluida la búsqueda): remonta el
          // componente para que su paginación acumulada arranque de cero,
          // en vez de arrastrar `orders` de la búsqueda/filtro anterior.
          key={`${status ?? ""}|${priority ?? ""}|${search ?? ""}|${equipmentId ?? ""}`}
          initialOrders={workOrders}
          total={total}
          filters={{ status, priority, search, equipmentId }}
          search={search}
          clearSearchHref={clearSearchHref}
        />
      )}
    </div>
  );
}
