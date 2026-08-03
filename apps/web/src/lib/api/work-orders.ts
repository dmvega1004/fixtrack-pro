import { cache } from "react";
import type { OrderStatus } from "@/components/shared/status-chip";
import type { Priority } from "@/components/shared/priority-badge";
import { serverFetch } from "./server-fetch";

// Debe reflejar exactamente el shape de WORK_ORDER_INCLUDE en
// packages/backend/src/work-orders/work-orders.service.ts
export interface WorkOrderClient {
  id: string;
  name: string;
}

export interface WorkOrderEquipment {
  id: string;
  brand: string;
  model: string;
  qrCode: string;
  client: WorkOrderClient;
}

export interface WorkOrderAssignee {
  id: string;
  name: string;
  email: string;
}

export interface WorkOrder {
  id: string;
  orderNumber: number;
  description: string;
  diagnosis: string | null;
  observations: string | null;
  status: OrderStatus;
  priority: Priority;
  equipmentId: string;
  userId: string | null;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  equipment: WorkOrderEquipment;
  user: WorkOrderAssignee | null;
}

export interface WorkOrderFilters {
  status?: OrderStatus;
  priority?: Priority;
}

/**
 * GET /work-orders. El backend solo soporta filtro por `status` en query
 * (ver WorkOrdersController.findAll); la visibilidad por rol (Admin/Coordinador
 * ven todas, Técnico solo las suyas) ya la aplica el backend, no hay nada que
 * replicar acá. El filtro por prioridad no existe en el backend, así que se
 * aplica del lado de Next después del fetch.
 */
export async function getWorkOrders(
  filters: WorkOrderFilters = {},
): Promise<WorkOrder[]> {
  const query = filters.status ? `?status=${filters.status}` : "";
  const workOrders = await serverFetch<WorkOrder[]>(`/work-orders${query}`);

  if (!filters.priority) {
    return workOrders;
  }

  return workOrders.filter((order) => order.priority === filters.priority);
}

/**
 * cache() de React: si en el mismo render se llama con el mismo id desde
 * varios lugares (ej. generateMetadata + la página), Next deduplica y solo
 * pega una vez al backend.
 */
export const getWorkOrder = cache((id: string): Promise<WorkOrder> => {
  return serverFetch<WorkOrder>(`/work-orders/${id}`);
});
