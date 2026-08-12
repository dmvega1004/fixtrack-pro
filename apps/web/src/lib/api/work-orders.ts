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
  serialNumber: string | null;
  location: string | null;
  qrCode: string;
}

export interface WorkOrderAssignee {
  id: string;
  name: string;
  email: string;
}

/** Debe reflejar exactamente el enum PaymentStatus de packages/database/prisma/schema.prisma */
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export interface WorkOrder {
  id: string;
  orderNumber: number;
  description: string;
  diagnosis: string | null;
  observations: string | null;
  status: OrderStatus;
  priority: Priority;
  /** Cliente dueño de la orden — vínculo principal, siempre presente. */
  clientId: string;
  userId: string | null;
  companyId: string;
  /** Mano de obra cobrada en la orden. */
  laborAmount: string;
  /** Cargos adicionales (transporte u otros), con su descripción. */
  additionalAmount: string;
  additionalDescription: string | null;
  discountAmount: string;
  /** Congelados al pasar la orden a COMPLETED; null mientras sigue abierta. */
  taxRateApplied: string | null;
  totalAmount: string | null;
  billedAt: string | null;
  paymentStatus: PaymentStatus;
  /** Consecutivo de la cuenta de cobro emitida sobre esta orden; null hasta que se genera. */
  collectionNumber: number | null;
  collectionIssuedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: WorkOrderClient;
  /** Vacío cuando la orden es un servicio locativo; puede tener varios equipos. */
  equipments: WorkOrderEquipment[];
  user: WorkOrderAssignee | null;
}

export interface WorkOrderFilters {
  status?: OrderStatus;
  priority?: Priority;
  paymentStatus?: PaymentStatus;
  clientId?: string;
  equipmentId?: string;
  userId?: string;
  /** Buscador de una sola casilla: OT, cuenta de cobro, cliente, NIT o descripción. */
  search?: string;
  take?: number;
  skip?: number;
}

function buildWorkOrderQuery(filters: WorkOrderFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.equipmentId) params.set("equipmentId", filters.equipmentId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.search) params.set("search", filters.search);
  if (filters.take !== undefined) params.set("take", String(filters.take));
  if (filters.skip !== undefined) params.set("skip", String(filters.skip));
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * GET /work-orders[?status=&priority=&paymentStatus=&clientId=&equipmentId=&userId=&take=&skip=]
 * Todos los filtros los aplica el backend (ver WorkOrdersController.findAll);
 * la visibilidad por rol (Admin/Coordinador ven todas, Técnico solo las
 * suyas) también la aplica el backend, no hay nada que replicar acá.
 */
export function getWorkOrders(filters: WorkOrderFilters = {}): Promise<WorkOrder[]> {
  return serverFetch<WorkOrder[]>(`/work-orders${buildWorkOrderQuery(filters)}`);
}

/** GET /work-orders/count — mismos filtros que arriba (menos take/skip). */
export async function getWorkOrdersCount(
  filters: Omit<WorkOrderFilters, "take" | "skip"> = {},
): Promise<number> {
  const { count } = await serverFetch<{ count: number }>(
    `/work-orders/count${buildWorkOrderQuery(filters)}`,
  );
  return count;
}

/**
 * cache() de React: si en el mismo render se llama con el mismo id desde
 * varios lugares (ej. generateMetadata + la página), Next deduplica y solo
 * pega una vez al backend.
 */
export const getWorkOrder = cache((id: string): Promise<WorkOrder> => {
  return serverFetch<WorkOrder>(`/work-orders/${id}`);
});

export interface WorkOrderStatusCount {
  status: OrderStatus;
  count: number;
}

export interface WorkOrderTechnicianRankingEntry {
  userId: string;
  name: string;
  closedCount: number;
}

// Debe reflejar exactamente WorkOrderDashboardStats en
// packages/backend/src/work-orders/work-orders.service.ts
export interface WorkOrderDashboardStats {
  statusCounts: WorkOrderStatusCount[];
  activeCount: number;
  unassignedActiveCount: number;
  avgResolutionDays: number | null;
  technicianRanking: WorkOrderTechnicianRankingEntry[];
  recentOrders: WorkOrder[];
}

/** GET /work-orders/stats. Solo ADMIN/COORDINATOR (403 para Técnico). */
export function getWorkOrderStats(): Promise<WorkOrderDashboardStats> {
  return serverFetch<WorkOrderDashboardStats>("/work-orders/stats");
}

/**
 * POST /work-orders/:id/collection-document. Solo ADMIN. 409 si la orden
 * no está cerrada; idempotente si ya tiene número (no consume otro).
 */
export function generateCollectionDocument(id: string): Promise<WorkOrder> {
  return serverFetch<WorkOrder>(`/work-orders/${id}/collection-document`, {
    method: "POST",
  });
}
