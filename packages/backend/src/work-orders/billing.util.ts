import { Prisma, PaymentStatus } from 'database';

export interface BillingComponents {
  laborAmount: Prisma.Decimal;
  partsTotal: Prisma.Decimal;
  /** Σ(WorkOrderItem.quantity × unitPrice) — conceptos, ver WorkOrderItem en el schema. */
  itemsTotal: Prisma.Decimal;
  additionalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
}

export interface BillingResult {
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * Fórmula única de valorización de una orden, compartida entre el cálculo
 * en vivo (WorkOrderPartsService.listParts) y el congelamiento al pasar a
 * COMPLETED (WorkOrdersService.update):
 *
 *   subtotal  = mano de obra + repuestos (precio de venta) + conceptos + adicionales − descuento
 *   impuesto  = subtotal × tasa / 100
 *   total     = subtotal + impuesto
 */
export function calculateBilling(components: BillingComponents): BillingResult {
  const subtotal = components.laborAmount
    .add(components.partsTotal)
    .add(components.itemsTotal)
    .add(components.additionalAmount)
    .sub(components.discountAmount);
  const taxAmount = subtotal.mul(components.taxRate).div(100);
  const total = subtotal.add(taxAmount);

  return { subtotal, taxAmount, total };
}

/**
 * Deriva WorkOrder.paymentStatus a partir del total congelado y lo abonado
 * hasta ahora. Se recalcula dentro de la misma transacción cada vez que se
 * registra o elimina un pago (PaymentsService), y también al editar la
 * valorización de una orden cerrada (WorkOrdersService.update) — nunca se
 * guarda un delta, siempre se deriva de la suma real de Payment para esa
 * orden.
 *
 * PAID se evalúa PRIMERO (no PENDING): con total=0 y pagado=0,
 * `paidAmount.gte(total)` es cierto (0 >= 0), así que una orden dejada en
 * cero (ej. se condona el cobro) queda PAID y desaparece sola de cobros
 * pendientes — si PENDING fuera el primer chequeo, "pagado <= 0" ganaría
 * y una orden en $0 se quedaría colgada como pendiente para siempre.
 */
export function derivePaymentStatus(
  total: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): PaymentStatus {
  if (paidAmount.gte(total)) return PaymentStatus.PAID;
  if (paidAmount.lte(0)) return PaymentStatus.PENDING;
  return PaymentStatus.PARTIAL;
}
