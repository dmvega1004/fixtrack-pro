import { cache } from "react";
import type { OrderStatus } from "@/components/shared/status-chip";
import type { Priority } from "@/components/shared/priority-badge";
import type { ServiceType } from "@/components/shared/service-type-badge";
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
  /**
   * Recomendaciones al cliente, separadas de `observations` (notas de lo
   * que se hizo). Alimenta la sección SUGGESTIONS del formato de informe
   * propio del cliente y, si tiene contenido, un bloque propio en el
   * informe de la empresa.
   */
  suggestions: string | null;
  /**
   * Cliente FINAL del servicio, cuando se trabaja como subcontratista de
   * `client` (ver WorkOrder.endClientName en el schema). Vacío si no se
   * definió — la línea "Cliente" del formato de informe propio sale en
   * blanco.
   */
  endClientName: string | null;
  /**
   * Ciudad donde se ejecutó ESTE servicio — puede diferir de la ciudad
   * registrada en la ficha del cliente. Vacío: el formato de informe
   * propio del cliente usa la ciudad del cliente como respaldo.
   */
  serviceCity: string | null;
  /**
   * Hora del servicio, texto "HH:mm" capturado por el usuario — NUNCA un
   * instante calculado (ver WorkOrder.serviceTime en el schema). Vacío: el
   * formato de informe propio del cliente usa la hora de cierre (billedAt)
   * como respaldo.
   */
  serviceTime: string | null;
  /**
   * Firmas en sitio (Módulo de Firmas) — visibles para los TRES roles (no
   * son datos financieros). technicianName/technicianDocument/
   * technicianRole son FOTOGRAFÍAS tomadas de User.name/documentNumber y
   * del rol de quien firma al capturar, nunca se leen del usuario al
   * imprimir. receiverName/receiverDocument/receiverRole/receiverCompany
   * son siempre texto libre (quien recibe no tiene cuenta en el sistema).
   */
  technicianSignatureUrl: string | null;
  technicianName: string | null;
  technicianDocument: string | null;
  technicianRole: string | null;
  receiverSignatureUrl: string | null;
  receiverName: string | null;
  receiverDocument: string | null;
  receiverRole: string | null;
  receiverCompany: string | null;
  signedAt: string | null;
  status: OrderStatus;
  priority: Priority;
  /** CORRECTIVE por defecto. El técnico no puede cambiarlo tras la creación. */
  serviceType: ServiceType;
  /** Cliente dueño de la orden — vínculo principal, siempre presente. */
  clientId: string;
  userId: string | null;
  companyId: string;
  /**
   * Mano de obra cobrada en la orden. Omitido por el backend para
   * TECHNICIAN (RBAC financiero) — igual que el resto de los campos
   * monetarios de este bloque.
   */
  laborAmount?: string;
  /** Cargos adicionales (transporte u otros), con su descripción. */
  additionalAmount?: string;
  additionalDescription?: string | null;
  discountAmount?: string;
  /** Congelados al pasar la orden a COMPLETED; null mientras sigue abierta. */
  taxRateApplied?: string | null;
  totalAmount?: string | null;
  /** totalAmount menos retenciones — igual a totalAmount si la orden no tiene ninguna. Omitido para TECHNICIAN. */
  netAmount?: string | null;
  /**
   * Costo interno del trabajo, fuera de inventario (ver módulo de
   * Rentabilidad). Redactado por el backend para todo rol distinto de
   * ADMIN — nunca se cobra al cliente ni aparece en ningún documento.
   */
  directCostAmount?: string;
  directCostDescription?: string | null;
  billedAt: string | null;
  /** Omitido para TECHNICIAN. */
  paymentStatus?: PaymentStatus;
  /** Consecutivo de la cuenta de cobro emitida sobre esta orden; null hasta que se genera. Omitido para TECHNICIAN. */
  collectionNumber?: number | null;
  collectionIssuedAt?: string | null;
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
  /** Equipos con plan de mantenimiento activo por vencer o ya vencidos. */
  maintenanceDueCount: number;
  /** Cotizaciones enviadas sin decisión cuyo followUpAt ya pasó o es hoy. */
  quotesFollowUpCount: number;
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
