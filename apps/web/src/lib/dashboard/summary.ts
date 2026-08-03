import type { WorkOrder } from "@/lib/api/work-orders";
import type { SparePart } from "@/lib/api/spare-parts";
import type { Employee } from "@/lib/api/users";
import type { OrderStatus } from "@/components/shared/status-chip";

/**
 * Cálculos puros para el panel de decisiones de la home del dashboard.
 * Todo se deriva en el servidor de Next a partir de los endpoints que ya
 * existen (getWorkOrders, getSpareParts, getTechnicians) — sin cambios de
 * backend. Cuando el volumen de órdenes/repuestos por empresa crezca lo
 * suficiente para que recalcular esto en cada carga de página sea costoso,
 * esto debería convertirse en un endpoint agregador GET /dashboard/summary
 * que precalcule (o cachee) los mismos números en el backend.
 *
 * Nota sobre "Ventas del mes": se omite a propósito. GET /work-orders no
 * incluye los repuestos usados por orden (totalSale vive solo en
 * GET /work-orders/:id/parts, por orden). Sumarlo aquí implicaría un
 * fetch N+1 (uno por orden) en cada carga del dashboard, así que hasta que
 * exista un agregador en el backend esta tarjeta no se muestra.
 *
 * Funciones puras y sin dependencias de React/Next: fáciles de testear
 * unitariamente y de mover a otro runtime si este cálculo migra al backend.
 */

/** Coincide con TERMINAL_STATUSES de packages/backend/src/work-orders/work-orders.service.ts. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];

// Import type-only de OrderStatus arriba: mantiene este módulo libre de una
// dependencia en tiempo de ejecución sobre un archivo .tsx (status-chip.tsx),
// para que siga siendo un módulo TS puro y portable.
const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELIVERED",
  "CANCELLED",
];

const DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * DAY_MS;

export function isTerminalStatus(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Órdenes "activas" = todo lo que no sea DELIVERED/CANCELLED (COMPLETED sigue activa hasta entregarse). */
export function filterActiveOrders(orders: WorkOrder[]): WorkOrder[] {
  return orders.filter((order) => !isTerminalStatus(order.status));
}

export function filterUnassignedActiveOrders(orders: WorkOrder[]): WorkOrder[] {
  return filterActiveOrders(orders).filter((order) => order.user === null);
}

export interface StatusCount {
  status: OrderStatus;
  count: number;
}

export function countByStatus(orders: WorkOrder[]): StatusCount[] {
  return ALL_STATUSES.map((status) => ({
    status,
    count: orders.filter((order) => order.status === status).length,
  }));
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

/** Promedio en días entre creación y última actualización de las órdenes cerradas (DELIVERED/CANCELLED), sin ventana de tiempo. */
export function averageResolutionDays(orders: WorkOrder[]): number | null {
  const closed = orders.filter((order) => isTerminalStatus(order.status));
  if (closed.length === 0) return null;

  const totalDays = closed.reduce((sum, order) => {
    const created = new Date(order.createdAt).getTime();
    const updated = new Date(order.updatedAt).getTime();
    return sum + (updated - created) / DAY_MS;
  }, 0);

  return totalDays / closed.length;
}

export interface TechnicianRankingEntry {
  userId: string;
  name: string;
  closedCount: number;
}

/**
 * Ranking de técnicos por órdenes cerradas (DELIVERED/CANCELLED) en los
 * últimos 30 días. Incluye a todo el roster de técnicos activos (aunque
 * tengan 0 en el período), para que el panel muestre al equipo completo y
 * no solo a quien tuvo actividad reciente.
 */
export function technicianRanking(
  orders: WorkOrder[],
  technicians: Pick<Employee, "id" | "name">[],
  now: Date = new Date(),
): TechnicianRankingEntry[] {
  const since = now.getTime() - THIRTY_DAYS_MS;
  const counts = new Map<string, number>();

  for (const order of orders) {
    if (!order.user || !isTerminalStatus(order.status)) continue;
    if (new Date(order.updatedAt).getTime() < since) continue;
    counts.set(order.user.id, (counts.get(order.user.id) ?? 0) + 1);
  }

  const roster = new Map(technicians.map((technician) => [technician.id, technician.name]));
  for (const id of roster.keys()) {
    if (!counts.has(id)) counts.set(id, 0);
  }

  return Array.from(counts.entries())
    .map(([userId, closedCount]) => ({
      userId,
      name: roster.get(userId) ?? "Técnico",
      closedCount,
    }))
    .sort((a, b) => b.closedCount - a.closedCount);
}

export function recentOrders(orders: WorkOrder[], limit = 5): WorkOrder[] {
  return [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/** Los más críticos primero: mayor déficit (stock - minStock, más negativo primero). */
export function lowStockAlerts(spareParts: SparePart[], limit = 5): SparePart[] {
  return [...spareParts]
    .sort((a, b) => a.stock - a.minStock - (b.stock - b.minStock))
    .slice(0, limit);
}
