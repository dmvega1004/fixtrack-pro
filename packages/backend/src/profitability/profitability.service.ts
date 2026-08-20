import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from 'database';
import { PrismaService } from '../prisma.service';
import { calculateProfitability } from './profitability.util';

export interface ProfitabilitySummary {
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
}

export interface ProfitabilityOrderView {
  orderId: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  billedAt: string;
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
}

export interface ProfitabilityClientView {
  clientId: string;
  clientName: string;
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
}

export interface ProfitabilityMonthPoint {
  /** "YYYY-MM" */
  month: string;
  income: string;
  cost: string;
  margin: string;
  marginPercent: number | null;
}

export type ProfitabilityOrderSortBy = 'margin' | 'marginPercent';
export type SortOrder = 'asc' | 'desc';

interface ComputedOrder {
  orderId: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  billedAt: Date;
  income: Prisma.Decimal;
  cost: Prisma.Decimal;
  margin: Prisma.Decimal;
  marginPercent: number | null;
}

const MONTHS_IN_TREND = 12;

/** [inicio, fin) de un mes calendario local, `offset` meses respecto al mes actual (0 = mes actual). */
function monthRange(offset: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - offset);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function parseRangeDate(value: string, label: string): Date {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(
      `${label} inválida: "${value}". Se espera el formato YYYY-MM-DD.`,
    );
  }
  return date;
}

/**
 * Resuelve el rango [start, end) del período consultado. Sin `from`/`to`
 * (los dos, o ninguno) cae al mes calendario actual — mismo criterio de
 * "período por defecto" que BillingService.currentMonthRange.
 */
function resolveRange(from?: string, to?: string): { start: Date; end: Date } {
  if (!from && !to) {
    return monthRange(0);
  }
  if (!from || !to) {
    throw new BadRequestException(
      'Debes enviar from y to juntos, o ninguno para usar el mes actual',
    );
  }

  const start = parseRangeDate(from, 'from');
  const endInclusive = parseRangeDate(to, 'to');
  if (endInclusive.getTime() < start.getTime()) {
    throw new BadRequestException('to no puede ser anterior a from');
  }

  // Límite superior EXCLUSIVO: "to" es el último día incluido.
  const end = new Date(endInclusive);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * Módulo de Rentabilidad (SOLO LECTURA, exclusivo ADMIN — ver @Roles en el
 * controller): margen bruto por orden, por cliente y por mes. Responde una
 * pregunta distinta a Cobros: Cobros dice cuánto deben; esto dice cuáles
 * trabajos dejan plata.
 *
 * Universo de datos: órdenes con billedAt dentro del período, EXCLUYENDO
 * las canceladas (una orden puede facturarse y cancelarse después — ver
 * WorkOrdersService, CANCELLED no es un estado inicial excluyente de
 * COMPLETED). Nunca escribe nada: es un espejo de WorkOrder/WorkOrderPart.
 */
@Injectable()
export class ProfitabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<ProfitabilitySummary> {
    const { start, end } = resolveRange(from, to);
    const orders = await this.loadOrders(companyId, start, end);
    return this.aggregate(orders);
  }

  async getOrders(
    companyId: string,
    from?: string,
    to?: string,
    sortBy?: string,
    order?: string,
  ): Promise<ProfitabilityOrderView[]> {
    const { start, end } = resolveRange(from, to);
    const orders = await this.loadOrders(companyId, start, end);

    const items = orders.map((o) => this.toOrderView(o));

    if (sortBy !== undefined) {
      if (sortBy !== 'margin' && sortBy !== 'marginPercent') {
        throw new BadRequestException(
          'sortBy debe ser "margin" o "marginPercent"',
        );
      }
      const dir: SortOrder = order === 'asc' ? 'asc' : 'desc';
      items.sort((a, b) => {
        // Sin porcentaje (income 0) queda siempre al final, sin importar el orden.
        const av = sortBy === 'margin' ? Number(a.margin) : a.marginPercent;
        const bv = sortBy === 'margin' ? Number(b.margin) : b.marginPercent;
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return dir === 'asc' ? av - bv : bv - av;
      });
    }

    return items;
  }

  async getByClient(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<ProfitabilityClientView[]> {
    const { start, end } = resolveRange(from, to);
    const orders = await this.loadOrders(companyId, start, end);

    const byClient = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        income: Prisma.Decimal;
        cost: Prisma.Decimal;
      }
    >();
    for (const o of orders) {
      const existing = byClient.get(o.clientId);
      if (existing) {
        existing.income = existing.income.add(o.income);
        existing.cost = existing.cost.add(o.cost);
      } else {
        byClient.set(o.clientId, {
          clientId: o.clientId,
          clientName: o.clientName,
          income: o.income,
          cost: o.cost,
        });
      }
    }

    return Array.from(byClient.values())
      .map(({ income, cost, ...rest }) => {
        const margin = income.sub(cost);
        const marginPercent = income.isZero()
          ? null
          : margin.div(income).mul(100).toNumber();
        return {
          ...rest,
          income: income.toFixed(2),
          cost: cost.toFixed(2),
          margin: margin.toFixed(2),
          marginPercent,
        };
      })
      .sort((a, b) => Number(b.margin) - Number(a.margin));
  }

  /** Últimos 12 meses calendario (incluye el actual), para la tendencia. */
  async getMonthly(companyId: string): Promise<ProfitabilityMonthPoint[]> {
    const { start } = monthRange(MONTHS_IN_TREND - 1);
    const { end } = monthRange(0);

    const orders = await this.loadOrders(companyId, start, end);

    const buckets = new Map<
      string,
      { income: Prisma.Decimal; cost: Prisma.Decimal }
    >();
    for (let i = MONTHS_IN_TREND - 1; i >= 0; i--) {
      const { start: bucketStart } = monthRange(i);
      buckets.set(monthKey(bucketStart), {
        income: new Prisma.Decimal(0),
        cost: new Prisma.Decimal(0),
      });
    }

    for (const o of orders) {
      const bucket = buckets.get(monthKey(o.billedAt));
      if (!bucket) continue; // fuera de la ventana por redondeo de horas — no debería pasar
      bucket.income = bucket.income.add(o.income);
      bucket.cost = bucket.cost.add(o.cost);
    }

    return Array.from(buckets.entries()).map(([month, { income, cost }]) => {
      const margin = income.sub(cost);
      const marginPercent = income.isZero()
        ? null
        : margin.div(income).mul(100).toNumber();
      return {
        month,
        income: income.toFixed(2),
        cost: cost.toFixed(2),
        margin: margin.toFixed(2),
        marginPercent,
      };
    });
  }

  /**
   * Carga y calcula el margen de cada orden facturada del período — base
   * compartida de los 4 endpoints (mismo principio que
   * BillingService.getReceivables: un solo cálculo, varias vistas).
   */
  private async loadOrders(
    companyId: string,
    start: Date,
    end: Date,
  ): Promise<ComputedOrder[]> {
    const orders = await this.prisma.workOrder.findMany({
      where: {
        companyId, // candado
        billedAt: { gte: start, lt: end },
        totalAmount: { not: null },
        status: { not: OrderStatus.CANCELLED },
      },
      include: {
        client: { select: { id: true, name: true } },
        parts: { select: { unitCost: true, quantity: true } },
      },
      orderBy: { billedAt: 'desc' },
    });

    return orders.map((order) => {
      const partsCost = order.parts.reduce(
        (acc, p) => acc.add(p.unitCost.mul(p.quantity)),
        new Prisma.Decimal(0),
      );

      const { income, cost, margin, marginPercent } = calculateProfitability({
        totalAmount: order.totalAmount!,
        taxRateApplied: order.taxRateApplied,
        directCostAmount: order.directCostAmount,
        partsCost,
      });

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        clientId: order.client.id,
        clientName: order.client.name,
        billedAt: order.billedAt!,
        income,
        cost,
        margin,
        marginPercent,
      };
    });
  }

  private toOrderView(o: ComputedOrder): ProfitabilityOrderView {
    return {
      orderId: o.orderId,
      orderNumber: o.orderNumber,
      clientId: o.clientId,
      clientName: o.clientName,
      billedAt: o.billedAt.toISOString(),
      income: o.income.toFixed(2),
      cost: o.cost.toFixed(2),
      margin: o.margin.toFixed(2),
      marginPercent: o.marginPercent,
    };
  }

  /** Agrega el período completo — la SUMA primero, el porcentaje derivado después (nunca el promedio de porcentajes). */
  private aggregate(orders: ComputedOrder[]): ProfitabilitySummary {
    const income = orders.reduce(
      (acc, o) => acc.add(o.income),
      new Prisma.Decimal(0),
    );
    const cost = orders.reduce(
      (acc, o) => acc.add(o.cost),
      new Prisma.Decimal(0),
    );
    const margin = income.sub(cost);
    const marginPercent = income.isZero()
      ? null
      : margin.div(income).mul(100).toNumber();

    return {
      income: income.toFixed(2),
      cost: cost.toFixed(2),
      margin: margin.toFixed(2),
      marginPercent,
    };
  }
}
