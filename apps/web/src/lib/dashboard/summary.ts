import type { WorkOrder } from "@/lib/api/work-orders";
import type { SparePart } from "@/lib/api/spare-parts";
import type { OrderStatus } from "@/components/shared/status-chip";
import type { Priority } from "@/components/shared/priority-badge";

/**
 * Cálculos puros para el home del Técnico (technician-dashboard.tsx), que
 * opera sobre GET /work-orders ya acotado por el backend a las órdenes
 * asignadas a ese técnico — volumen naturalmente pequeño, no hace falta un
 * agregador de backend para esto.
 *
 * El home de Admin/Coordinador (admin-dashboard.tsx) usaba antes este mismo
 * patrón sobre TODAS las órdenes de la empresa (auditoría de rendimiento);
 * esos cálculos (conteo por estado, promedio de resolución, ranking de
 * técnicos, recientes) ahora vienen de GET /work-orders/stats — ver
 * WorkOrdersService.getStats en el backend. `StatusCount` y
 * `TechnicianRankingEntry` se mantienen acá porque los paneles de
 * presentación (orders-by-status-panel.tsx, technician-performance-panel.tsx)
 * siguen tipando sus props con ellos.
 *
 * Nota sobre "Ventas del mes": se omite a propósito. GET /work-orders no
 * incluye los repuestos usados por orden (totalSale vive solo en
 * GET /work-orders/:id/parts, por orden). Sumarlo aquí implicaría un
 * fetch N+1 (uno por orden) en cada carga del dashboard.
 *
 * Funciones puras y sin dependencias de React/Next: fáciles de testear
 * unitariamente y de mover a otro runtime si este cálculo migra al backend.
 */

/** Coincide con TERMINAL_STATUSES de packages/backend/src/work-orders/work-orders.service.ts. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

const DAY_MS = 24 * 60 * 60 * 1000;

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Órdenes "activas" = todo lo que no sea DELIVERED/CANCELLED (COMPLETED sigue activa hasta entregarse). */
export function filterActiveOrders(orders: WorkOrder[]): WorkOrder[] {
  return orders.filter((order) => !isTerminalStatus(order.status));
}

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

export interface TechnicianRankingEntry {
  userId: string;
  name: string;
  closedCount: number;
}

function isSameMonth(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

/**
 * Cuenta órdenes COMPLETED o DELIVERED cuya última actualización cae en el
 * mes en curso. No hay timestamp de "fecha de cierre" en el modelo, así que
 * updatedAt es la mejor aproximación disponible sin tocar el backend.
 */
export function countCompletedOrDeliveredInMonth(
  orders: WorkOrder[],
  now: Date = new Date(),
): number {
  return orders.filter(
    (order) =>
      (order.status === "COMPLETED" || order.status === "DELIVERED") &&
      isSameMonth(new Date(order.updatedAt), now),
  ).length;
}

/** Los más críticos primero: mayor déficit (stock - minStock, más negativo primero). */
export function lowStockAlerts(spareParts: SparePart[], limit = 5): SparePart[] {
  return [...spareParts]
    .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock))
    .slice(0, limit);
}

export function filterByStatus(orders: WorkOrder[], status: OrderStatus): WorkOrder[] {
  return orders.filter((order) => order.status === status);
}

export function filterHighPriorityActive(orders: WorkOrder[]): WorkOrder[] {
  return filterActiveOrders(orders).filter((order) => order.priority === "HIGH");
}

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Prioridad más alta primero; a igual prioridad, la más desatendida (updatedAt más antiguo) primero. */
export function sortActiveOrdersByUrgency(orders: WorkOrder[]): WorkOrder[] {
  return [...filterActiveOrders(orders)].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
  });
}

export interface StaleOrder {
  order: WorkOrder;
  daysSinceUpdate: number;
}

/**
 * Órdenes activas sin actividad hace más de `thresholdDays`, la más
 * desatendida primero. Usa updatedAt: no hay un timestamp específico de
 * "último contacto" en el modelo.
 */
export function staleActiveOrders(
  orders: WorkOrder[],
  thresholdDays = 5,
  now: Date = new Date(),
): StaleOrder[] {
  return filterActiveOrders(orders)
    .map((order) => ({
      order,
      daysSinceUpdate: Math.floor(
        (now.getTime() - new Date(order.updatedAt).getTime()) / DAY_MS,
      ),
    }))
    .filter(({ daysSinceUpdate }) => daysSinceUpdate > thresholdDays)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

/** Últimas órdenes cerradas (COMPLETED/DELIVERED), la más reciente primero. */
export function recentlyClosedOrders(orders: WorkOrder[], limit = 5): WorkOrder[] {
  return orders
    .filter((order) => order.status === "COMPLETED" || order.status === "DELIVERED")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
