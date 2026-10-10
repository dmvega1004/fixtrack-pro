import { bogotaDayKey, formatDate, formatDateCompact } from "./dates";
import { formatDateOnly, toDateInputValue } from "./date-only";
import type { WorkOrder } from "@/lib/api/work-orders";

type OrderDates = Pick<WorkOrder, "serviceDate" | "createdAt">;

/**
 * Fecha EFECTIVA de una orden en pantalla: cuándo se ejecutó el servicio
 * (serviceDate) y, si no se capturó, cuándo se registró (createdAt) — el
 * mismo respaldo que ya usa la impresión (work-order-print-document.tsx).
 * Sin esto, una orden registrada días después del servicio mostraba una
 * fecha en la lista y otra en el PDF.
 *
 * Cada campo con SU formateador: serviceDate es @db.Date (día calendario,
 * UTC — ./date-only) y createdAt es un instante (hora de Bogotá — ./dates).
 */
export function formatOrderDate(order: OrderDates): string {
  return order.serviceDate ? formatDateOnly(order.serviceDate) : formatDate(order.createdAt);
}

/** Versión para columnas angostas de tabla — ver formatDateCompact. */
export function formatOrderDateCompact(order: OrderDates): string {
  return order.serviceDate
    ? formatDateCompact(order.serviceDate, "es-CO", "UTC")
    : formatDateCompact(order.createdAt);
}

/** "YYYY-MM-DD" de la fecha efectiva — mismo criterio que formatOrderDate. */
function effectiveDayKey(order: OrderDates): string {
  return order.serviceDate
    ? toDateInputValue(order.serviceDate)
    : bogotaDayKey(new Date(order.createdAt));
}

/**
 * Comparador para `sort`: fecha efectiva descendente, por DÍA de
 * calendario — comparar serviceDate (medianoche UTC) contra createdAt (un
 * instante) tal cual desordena órdenes registradas de noche. Dentro del
 * mismo día desempata createdAt desc, para que el orden no quede al azar.
 *
 * Solo sirve para listas que llegan COMPLETAS al cliente (historiales de
 * equipo/cliente/personal); lo paginado tiene que ordenarse en el backend.
 */
export function compareOrdersByEffectiveDateDesc(a: OrderDates, b: OrderDates): number {
  return (
    effectiveDayKey(b).localeCompare(effectiveDayKey(a)) ||
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
