import { Prisma } from 'database';

export interface ProfitabilityInput {
  /** Total congelado de la orden (WorkOrder.totalAmount) — nunca se recalcula desde laborAmount/repuestos/adicionales. */
  totalAmount: Prisma.Decimal;
  /** Tasa de IVA congelada (WorkOrder.taxRateApplied) — null o 0 si el tenant no es responsable de IVA. */
  taxRateApplied: Prisma.Decimal | null;
  /** Costo del trabajo fuera de inventario (WorkOrder.directCostAmount). */
  directCostAmount: Prisma.Decimal;
  /** Σ(WorkOrderPart.unitCost × quantity) de la orden. */
  partsCost: Prisma.Decimal;
}

export interface ProfitabilityResult {
  income: Prisma.Decimal;
  cost: Prisma.Decimal;
  margin: Prisma.Decimal;
  /** Porcentaje (0-100), null si income es 0 — nunca se divide por cero. */
  marginPercent: number | null;
}

/**
 * Fórmula única del módulo de Rentabilidad (SOLO LECTURA, ADMIN):
 *
 *   ingresoBase  = totalAmount ÷ (1 + taxRateApplied / 100)
 *   costoDirecto = Σ(WorkOrderPart.unitCost × quantity) + directCostAmount
 *   margenBruto  = ingresoBase − costoDirecto
 *   porcentaje   = margenBruto ÷ ingresoBase
 *
 * El IVA se excluye a propósito: no es ingreso de la empresa, se recauda
 * para el Estado — incluirlo inflaría el margen artificialmente.
 *
 * SIEMPRE deriva del totalAmount CONGELADO de la orden (nunca recalcula
 * desde laborAmount + repuestos + adicionales − descuento), igual que
 * billing.util.calculateBilling: el margen de una orden de agosto debe
 * seguir siendo el mismo si se consulta en diciembre, aunque cambien los
 * precios del inventario o el IVA del tenant.
 */
export function calculateProfitability(
  input: ProfitabilityInput,
): ProfitabilityResult {
  const taxRate = input.taxRateApplied ?? new Prisma.Decimal(0);
  // taxRateApplied null o 0 → ingresoBase = totalAmount, sin dividir.
  const income = taxRate.isZero()
    ? input.totalAmount
    : input.totalAmount.div(taxRate.div(100).add(1));

  const cost = input.partsCost.add(input.directCostAmount);
  const margin = income.sub(cost);
  // totalAmount 0 → income 0 → porcentaje null (nunca NaN/Infinity).
  const marginPercent = income.isZero()
    ? null
    : margin.div(income).mul(100).toNumber();

  return { income, cost, margin, marginPercent };
}
