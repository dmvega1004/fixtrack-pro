"use client";

import { useState, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/lib/api/work-orders";
import type { WorkOrderFilters } from "@/lib/api/work-orders";
import { loadMoreWorkOrders } from "@/app/(dashboard)/ordenes/actions";
import { WorkOrdersList } from "./work-orders-list";
import { EmptyOrdersState } from "./empty-orders-state";
import { EmptySearchState } from "./empty-search-state";
import { EmptyOfflineOrdersState } from "./empty-offline-orders-state";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useSyncState } from "@/hooks/use-sync-state";

interface OrdersListWithLoadMoreProps {
  initialOrders: WorkOrder[];
  /** Total real (GET /work-orders/count), independiente de cuántas se hayan cargado. */
  total: number;
  filters: Pick<WorkOrderFilters, "status" | "priority" | "search" | "equipmentId">;
  /** Para decidir entre EmptyOrdersState y EmptySearchState — ver más abajo. */
  search?: string;
  clearSearchHref: string;
}

/**
 * Listado de /ordenes con "Cargar más" (paginación take/skip del backend)
 * — con señal, exactamente como siempre. Sin señal, cambia de fuente:
 * en vez de `initialOrders` (el HTML que haya alcanzado a servir el
 * service worker desde su caché, potencialmente viejo — ver
 * apps/web/public/sw.js) usa el conjunto de trabajo del almacén local
 * (lib/sync/engine.ts), que el motor mantiene fresco por su cuenta. Sin
 * filtros ni "Cargar más": son TODAS las órdenes no terminales guardadas,
 * de una vez — no hay más que traer, ya está todo lo que hay localmente.
 *
 * La decisión "vacío vs. lista" vive ACÁ adentro (no en ordenes/page.tsx,
 * que es server y no sabe si hay señal): si viviera en el server, una
 * página offline servida por el service worker con `initialOrders` vacío
 * (ej. quedó cacheada con un filtro sin resultados) nunca llegaría a
 * mostrar el conjunto de trabajo guardado, aunque sí exista.
 */
export function OrdersListWithLoadMore({
  initialOrders,
  total,
  filters,
  search,
  clearSearchHref,
}: OrdersListWithLoadMoreProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();
  const isOnline = useOnlineStatus();
  const { workset } = useSyncState();
  const hasMore = orders.length < total;

  function handleLoadMore() {
    startTransition(async () => {
      const next = await loadMoreWorkOrders(filters, orders.length);
      setOrders((current) => [...current, ...next]);
    });
  }

  if (!isOnline) {
    if (!workset || workset.orders.length === 0) {
      return <EmptyOfflineOrdersState />;
    }

    const hasActiveFilter = Boolean(
      filters.status || filters.priority || filters.search || filters.equipmentId,
    );

    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Mostrando las {workset.orders.length} órdenes guardadas, sin filtros
          ni búsqueda{hasActiveFilter ? " (los que tenías activos no se están aplicando)" : ""}.
        </p>
        <WorkOrdersList workOrders={workset.orders} />
      </div>
    );
  }

  if (orders.length === 0) {
    return search ? (
      <EmptySearchState term={search} clearHref={clearSearchHref} />
    ) : (
      <EmptyOrdersState />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkOrdersList workOrders={orders} />

      {hasMore && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className={cn(buttonVariants({ variant: "outline" }), "self-center")}
        >
          {isPending
            ? "Cargando..."
            : `Cargar más (${orders.length} de ${total})`}
        </button>
      )}
    </div>
  );
}
