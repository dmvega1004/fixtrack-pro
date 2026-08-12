"use server";

import { getWorkOrders, type WorkOrder, type WorkOrderFilters } from "@/lib/api/work-orders";
import { ORDERS_PAGE_SIZE } from "@/lib/work-orders-pagination";

/** Server Action: siguiente página de /ordenes con los mismos filtros activos. */
export async function loadMoreWorkOrders(
  filters: Pick<WorkOrderFilters, "status" | "priority" | "search">,
  skip: number,
): Promise<WorkOrder[]> {
  return getWorkOrders({ ...filters, take: ORDERS_PAGE_SIZE, skip });
}
