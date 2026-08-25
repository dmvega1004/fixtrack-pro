"use client";

import { useState, useTransition } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkOrder } from "@/lib/api/work-orders";
import type { WorkOrderFilters } from "@/lib/api/work-orders";
import { loadMoreWorkOrders } from "@/app/(dashboard)/ordenes/actions";
import { WorkOrdersList } from "./work-orders-list";

interface OrdersListWithLoadMoreProps {
  initialOrders: WorkOrder[];
  /** Total real (GET /work-orders/count), independiente de cuántas se hayan cargado. */
  total: number;
  filters: Pick<WorkOrderFilters, "status" | "priority" | "search" | "equipmentId">;
}

/** Listado de /ordenes con "Cargar más" (paginación take/skip del backend). */
export function OrdersListWithLoadMore({
  initialOrders,
  total,
  filters,
}: OrdersListWithLoadMoreProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [isPending, startTransition] = useTransition();
  const hasMore = orders.length < total;

  function handleLoadMore() {
    startTransition(async () => {
      const next = await loadMoreWorkOrders(filters, orders.length);
      setOrders((current) => [...current, ...next]);
    });
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
