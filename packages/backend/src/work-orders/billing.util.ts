import { Prisma, PaymentStatus } from 'database';

export interface BillingComponents {
  laborAmount: Prisma.Decimal;
  partsTotal: Prisma.Decimal;
  /** Σ(WorkOrderItem.quantity × unitPrice) — conceptos, ver WorkOrderItem en el schema. */
  itemsTotal: Prisma.Decimal;
  additionalAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxRate: Prisma.Decimal;
  /** Retenciones a aplicar — omitido/vacío si la orden no tiene ninguna. */
  retentions?: RetentionLineInput[];
}

export interface BillingResult {
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
  retentions: RetentionLineResult[];
  /** total − Σ(retentions.amount). Igual a `total` cuando no hay retenciones. */
  netAmount: Prisma.Decimal;
}

export type RetentionBase = 'SUBTOTAL' | 'IVA' | 'RETENTION';

/**
 * Una línea de retención a calcular. `id` es la clave con la que otra
 * línea la referencia desde `baseRetentionId` — en la práctica siempre el
 * id de la retención en el catálogo (Retention.id).
 */
export interface RetentionLineInput {
  id: string;
  name: string;
  rate: Prisma.Decimal;
  base: RetentionBase;
  /** Solo cuando base = RETENTION: el `id` de la línea de la que depende (debe venir en el mismo array). */
  baseRetentionId?: string | null;
}

export interface RetentionLineResult {
  id: string;
  name: string;
  rate: Prisma.Decimal;
  amount: Prisma.Decimal;
}

/**
 * Arma RetentionLineInput[] a partir de la selección aplicada a una orden
 * (name/rate — fotografías congeladas, ver WorkOrderRetention en el
 * schema) y la base/baseRetentionId ACTUAL de cada una en el catálogo:
 * qué se calcula sobre qué NO es una fotografía (solo name/rate lo son),
 * así que siempre se lee en vivo del catálogo al recalcular.
 *
 * Si una línea ya no tiene retención en el catálogo (retentionId null —
 * en la práctica no ocurre hoy: el catálogo no expone borrado, solo
 * desactivar), cae a SUBTOTAL como resguardo defensivo: no hay forma de
 * saber su base real, pero el cálculo no debe reventar por eso.
 */
export function buildRetentionLineInputs(
  lines: { retentionId: string; name: string; rate: Prisma.Decimal }[],
  catalogBases: Map<string, { base: string; baseRetentionId: string | null }>,
): RetentionLineInput[] {
  return lines.map((line) => {
    const info = catalogBases.get(line.retentionId);
    return {
      id: line.retentionId,
      name: line.name,
      rate: line.rate,
      base: (info?.base as RetentionBase | undefined) ?? 'SUBTOTAL',
      baseRetentionId: info?.baseRetentionId ?? null,
    };
  });
}

/**
 * Resuelve el desglose de retenciones respetando dependencias — una
 * retención con base RETENTION (ej. Avisos y tableros sobre ReteICA) se
 * calcula DESPUÉS de la retención de la que depende, sin importar el
 * orden en que vengan en `lines`. Rechaza referencias circulares
 * (directas o indirectas): una retención que depende de sí misma, directa
 * o a través de otras, colgaría el cálculo — se detecta con un set de
 * "en resolución" (DFS clásico) y se lanza en vez de recursar para siempre.
 *
 *   SUBTOTAL  → `subtotal` (después del descuento, ANTES del IVA — jamás
 *               el total facturado: aplicarla sobre el total con IVA daría
 *               un valor mayor al que el cliente va a retener)
 *   IVA       → `taxAmount`
 *   RETENTION → el amount YA CALCULADO de la retención referenciada
 */
export function calculateRetentions(
  lines: RetentionLineInput[],
  subtotal: Prisma.Decimal,
  taxAmount: Prisma.Decimal,
): RetentionLineResult[] {
  const byId = new Map(lines.map((line) => [line.id, line]));
  const amounts = new Map<string, Prisma.Decimal>();
  const resolving = new Set<string>();

  function resolve(line: RetentionLineInput): Prisma.Decimal {
    const cached = amounts.get(line.id);
    if (cached !== undefined) return cached;

    if (resolving.has(line.id)) {
      throw new Error(
        `Referencia circular en la configuración de retenciones (detectada en "${line.name}")`,
      );
    }
    resolving.add(line.id);

    let base: Prisma.Decimal;
    if (line.base === 'SUBTOTAL') {
      base = subtotal;
    } else if (line.base === 'IVA') {
      base = taxAmount;
    } else {
      const baseLine = line.baseRetentionId
        ? byId.get(line.baseRetentionId)
        : undefined;
      if (!baseLine) {
        throw new Error(
          `La retención "${line.name}" referencia una base que no está en el cálculo`,
        );
      }
      base = resolve(baseLine);
    }

    const amount = base.mul(line.rate).div(100);
    resolving.delete(line.id);
    amounts.set(line.id, amount);
    return amount;
  }

  return lines.map((line) => ({
    id: line.id,
    name: line.name,
    rate: line.rate,
    amount: resolve(line),
  }));
}

/**
 * Fórmula única de valorización de una orden, compartida entre el cálculo
 * en vivo (WorkOrderPartsService.listParts) y el congelamiento al pasar a
 * COMPLETED (WorkOrdersService.update):
 *
 *   subtotal  = mano de obra + repuestos (precio de venta) + conceptos + adicionales − descuento
 *   impuesto  = subtotal × tasa / 100
 *   total     = subtotal + impuesto
 *   retención = ver calculateRetentions (cada una sobre subtotal, IVA u otra retención)
 *   neto      = total − Σ retenciones
 */
export function calculateBilling(components: BillingComponents): BillingResult {
  const subtotal = components.laborAmount
    .add(components.partsTotal)
    .add(components.itemsTotal)
    .add(components.additionalAmount)
    .sub(components.discountAmount);
  const taxAmount = subtotal.mul(components.taxRate).div(100);
  const total = subtotal.add(taxAmount);

  const retentions = calculateRetentions(
    components.retentions ?? [],
    subtotal,
    taxAmount,
  );
  const retentionsTotal = retentions.reduce(
    (acc, r) => acc.add(r.amount),
    new Prisma.Decimal(0),
  );
  const netAmount = total.sub(retentionsTotal);

  return { subtotal, taxAmount, total, retentions, netAmount };
}

/**
 * Deriva WorkOrder.paymentStatus a partir de lo REALMENTE por cobrar
 * (netAmount — el total congelado menos las retenciones aplicadas; igual
 * a totalAmount cuando la orden no tiene ninguna) y lo abonado hasta
 * ahora. Se recalcula dentro de la misma transacción cada vez que se
 * registra o elimina un pago (PaymentsService), y también al editar la
 * valorización de una orden cerrada (WorkOrdersService.update) — nunca se
 * guarda un delta, siempre se deriva de la suma real de Payment para esa
 * orden.
 *
 * PAID se evalúa PRIMERO (no PENDING): con netAmount=0 y pagado=0,
 * `paidAmount.gte(netAmount)` es cierto (0 >= 0), así que una orden dejada
 * en cero (ej. se condona el cobro) queda PAID y desaparece sola de
 * cobros pendientes — si PENDING fuera el primer chequeo, "pagado <= 0"
 * ganaría y una orden en $0 se quedaría colgada como pendiente para
 * siempre.
 */
export function derivePaymentStatus(
  netAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): PaymentStatus {
  if (paidAmount.gte(netAmount)) return PaymentStatus.PAID;
  if (paidAmount.lte(0)) return PaymentStatus.PENDING;
  return PaymentStatus.PARTIAL;
}
