import { Prisma } from 'database';

export interface QuoteBillingComponents {
  /** Suma de (cantidad × precio unitario) de los ítems. */
  itemsTotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
}

export interface QuoteBillingResult {
  /** = itemsTotal, ANTES de descuento (así se guarda en Quote.subtotalAmount). */
  subtotal: Prisma.Decimal;
  /** subtotal − descuento, base sobre la que se calcula el IVA. */
  base: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * Fórmula única de valorización de una cotización, compartida entre el
 * cálculo en vivo de un borrador (QuotesService.buildBilling) y el
 * congelamiento al enviar (QuotesService.send):
 *
 *   subtotal = suma de (cantidad × precio unitario) de los ítems
 *   base     = subtotal − descuento
 *   IVA      = base × tasa / 100
 *   total    = base + IVA
 */
export function calculateQuoteBilling(
  components: QuoteBillingComponents,
): QuoteBillingResult {
  const subtotal = components.itemsTotal;
  const base = subtotal.sub(components.discountAmount);
  const taxAmount = base.mul(components.taxRate).div(100);
  const total = base.add(taxAmount);

  return { subtotal, base, taxAmount, total };
}
