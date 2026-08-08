import type { Receivable } from "@/lib/api/billing";
import type { WorkOrder } from "@/lib/api/work-orders";
import type { ReceivableRow } from "@/components/billing/receivables-panel";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Combina GET /billing/receivables (PENDING/PARTIAL, con saldo pendiente)
 * con las órdenes cerradas ya pagadas (para el chip "Pagadas" de /cobros)
 * en un único listado de filas. `now` como parámetro con default (no
 * `Date.now()` inline): función pura, testeable, y evita el lint de pureza
 * de render (react-hooks/purity) — mismo patrón que lib/dashboard/summary.ts.
 */
export function buildReceivableRows(
  receivables: Receivable[],
  paidOrders: WorkOrder[],
  now: Date = new Date(),
): ReceivableRow[] {
  return [
    ...receivables.map((receivable) => ({
      orderId: receivable.orderId,
      orderNumber: receivable.orderNumber,
      clientName: receivable.clientName,
      description: receivable.description,
      total: receivable.total,
      paid: receivable.paid,
      balance: receivable.balance,
      daysSinceBilled: receivable.daysSinceBilled,
      paymentTermDays: receivable.paymentTermDays,
      isOverdue: receivable.isOverdue,
      paymentStatus: receivable.paymentStatus,
    })),
    ...paidOrders.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientName: order.client.name,
      description: order.description,
      total: order.totalAmount!,
      paid: order.totalAmount!,
      balance: "0.00",
      daysSinceBilled: order.billedAt
        ? Math.floor((now.getTime() - new Date(order.billedAt).getTime()) / DAY_MS)
        : 0,
      paymentTermDays: 0,
      isOverdue: false,
      paymentStatus: order.paymentStatus,
    })),
  ];
}
