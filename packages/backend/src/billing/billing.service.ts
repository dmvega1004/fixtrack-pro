import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from 'database';
import { PrismaService } from '../prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Cuántos pagos recientes trae el panel de "últimos pagos" del dashboard de Cobros. */
const RECENT_PAYMENTS_LIMIT = 10;

export interface BillingSummary {
  /** Suma de totalAmount de órdenes facturadas (billedAt) este mes calendario. */
  billedThisMonth: string;
  /** Suma de Payment.amount con paidAt en este mes calendario. */
  collectedThisMonth: string;
  /** Saldo pendiente de TODAS las órdenes cerradas con paymentStatus PENDING o PARTIAL. */
  totalReceivable: string;
  /** Igual que totalReceivable, pero solo de las órdenes vencidas (billedAt + paymentTermDays < hoy). */
  totalOverdue: string;
  recentPayments: RecentPaymentView[];
}

export interface RecentPaymentView {
  id: string;
  amount: string;
  paidAt: string;
  method: PaymentMethod;
  orderId: string;
  orderNumber: number;
  clientName: string;
}

export interface ReceivableView {
  orderId: string;
  orderNumber: number;
  /** Número de la cuenta de cobro emitida sobre esta orden, si existe — para cruzar cobro y orden. */
  collectionNumber: number | null;
  clientId: string;
  clientName: string;
  description: string;
  total: string;
  paid: string;
  balance: string;
  billedAt: string;
  daysSinceBilled: number;
  paymentTermDays: number;
  isOverdue: boolean;
  paymentStatus: PaymentStatus;
}

export interface ClientBalanceView {
  clientId: string;
  clientName: string;
  balance: string;
}

export interface BilledOrderView {
  orderId: string;
  orderNumber: number;
  collectionNumber: number | null;
  clientId: string;
  clientName: string;
  billedAt: string;
  total: string;
  paymentStatus: PaymentStatus;
}

export interface BilledOrdersResult {
  items: BilledOrderView[];
  total: string;
}

export interface CollectedPaymentView {
  paymentId: string;
  paidAt: string;
  clientId: string;
  clientName: string;
  orderId: string;
  orderNumber: number;
  collectionNumber: number | null;
  method: PaymentMethod;
  reference: string | null;
  amount: string;
}

export interface CollectedPaymentsResult {
  items: CollectedPaymentView[];
  total: string;
}

export interface ReceivablesListResult {
  items: ReceivableView[];
  total: string;
}

/** [inicio del mes actual, inicio del mes siguiente) — límite superior explícito, no solo "desde". */
function currentMonthRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

/**
 * Módulo de Cobros (solo ADMIN, ver @Roles en BillingController): indicadores
 * de facturación/cobro y cartera. "Cuentas por cobrar" = órdenes cerradas
 * (totalAmount congelado) cuyo paymentStatus todavía no es PAID.
 *
 * Las 4 tarjetas de /cobros y sus vistas de detalle (/cobros/[indicador])
 * comparten exactamente el mismo cálculo: getSummary() arma sus totales a
 * partir de getBilledOrders/getCollectedPayments/getReceivablesDetail (los
 * mismos métodos que exponen los endpoints de detalle), así que el total de
 * cada tarjeta y el pie de su listado son, por construcción, el mismo número.
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string): Promise<BillingSummary> {
    const [billed, collected, receivablesDetail, recentPayments] =
      await Promise.all([
        this.getBilledOrders(companyId),
        this.getCollectedPayments(companyId),
        this.getReceivablesDetail(companyId),
        this.prisma.payment.findMany({
          where: { companyId }, // candado
          include: {
            workOrder: {
              select: { orderNumber: true, client: { select: { name: true } } },
            },
          },
          orderBy: { paidAt: 'desc' },
          take: RECENT_PAYMENTS_LIMIT,
        }),
      ]);

    const totalOverdue = this.sumBalances(
      receivablesDetail.items.filter((r) => r.isOverdue),
    );

    return {
      billedThisMonth: billed.total,
      collectedThisMonth: collected.total,
      totalReceivable: receivablesDetail.total,
      totalOverdue,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toFixed(2),
        paidAt: payment.paidAt.toISOString(),
        method: payment.method,
        orderId: payment.workOrderId,
        orderNumber: payment.workOrder.orderNumber,
        clientName: payment.workOrder.client.name,
      })),
    };
  }

  /**
   * GET /billing/billed-orders — "Facturado del mes": órdenes con billedAt
   * en el mes calendario actual, pagadas y no pagadas (mide trabajo
   * facturado, no cobro). Usa el índice WorkOrder(companyId, billedAt).
   */
  async getBilledOrders(companyId: string): Promise<BilledOrdersResult> {
    const { start, end } = currentMonthRange();

    const orders = await this.prisma.workOrder.findMany({
      where: {
        companyId, // candado
        billedAt: { gte: start, lt: end },
      },
      include: { client: { select: { id: true, name: true } } },
      orderBy: { billedAt: 'desc' },
    });

    const items: BilledOrderView[] = orders.map((order) => ({
      orderId: order.id,
      orderNumber: order.orderNumber,
      collectionNumber: order.collectionNumber,
      clientId: order.client.id,
      clientName: order.client.name,
      billedAt: order.billedAt!.toISOString(),
      // Toda orden con billedAt tiene totalAmount congelado en el mismo
      // momento (ver freeze en WorkOrdersService.update) — nunca es null acá.
      total: order.totalAmount!.toFixed(2),
      paymentStatus: order.paymentStatus,
    }));

    const total = items
      .reduce((acc, o) => acc.add(o.total), new Prisma.Decimal(0))
      .toFixed(2);

    return { items, total };
  }

  /**
   * GET /billing/collected-payments — "Cobrado del mes": PAGOS con paidAt
   * en el mes calendario actual (no órdenes) — un pago de una orden
   * facturada en un mes anterior cuenta acá. Usa el índice
   * Payment(companyId, paidAt).
   */
  async getCollectedPayments(
    companyId: string,
  ): Promise<CollectedPaymentsResult> {
    const { start, end } = currentMonthRange();

    const payments = await this.prisma.payment.findMany({
      where: {
        companyId, // candado
        paidAt: { gte: start, lt: end },
      },
      include: {
        workOrder: {
          select: {
            id: true,
            orderNumber: true,
            collectionNumber: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    const items: CollectedPaymentView[] = payments.map((payment) => ({
      paymentId: payment.id,
      paidAt: payment.paidAt.toISOString(),
      clientId: payment.workOrder.client.id,
      clientName: payment.workOrder.client.name,
      orderId: payment.workOrder.id,
      orderNumber: payment.workOrder.orderNumber,
      collectionNumber: payment.workOrder.collectionNumber,
      method: payment.method,
      reference: payment.reference,
      amount: payment.amount.toFixed(2),
    }));

    const total = items
      .reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0))
      .toFixed(2);

    return { items, total };
  }

  /**
   * GET /billing/receivables-detail — "Por cobrar": TODAS las órdenes
   * cerradas con saldo > 0, sin límite de fecha (acumulado, no mensual).
   * Mismos datos que GET /billing/receivables, con el total ya sumado.
   */
  async getReceivablesDetail(
    companyId: string,
  ): Promise<ReceivablesListResult> {
    const items = await this.getReceivables(companyId);
    return { items, total: this.sumBalances(items) };
  }

  /**
   * GET /billing/receivables-overdue — "Vencido": subconjunto de lo
   * anterior donde daysSinceBilled > paymentTermDays del cliente, de más
   * vencido a menos.
   */
  async getOverdueReceivables(
    companyId: string,
  ): Promise<ReceivablesListResult> {
    const items = (await this.getReceivables(companyId))
      .filter((r) => r.isOverdue)
      .sort((a, b) => b.daysSinceBilled - a.daysSinceBilled);
    return { items, total: this.sumBalances(items) };
  }

  private sumBalances(items: Pick<ReceivableView, 'balance'>[]): string {
    return items
      .reduce((acc, r) => acc.add(r.balance), new Prisma.Decimal(0))
      .toFixed(2);
  }

  /** GET /billing/receivables — de más antigua a más reciente (billedAt asc). */
  async getReceivables(companyId: string): Promise<ReceivableView[]> {
    const orders = await this.prisma.workOrder.findMany({
      where: {
        companyId, // candado
        totalAmount: { not: null },
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.PARTIAL] },
      },
      include: {
        client: { select: { id: true, name: true, paymentTermDays: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { billedAt: 'asc' },
    });

    const now = Date.now();

    return orders.map((order) => {
      const paid = order.payments.reduce(
        (acc, payment) => acc.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const balance = order.totalAmount!.sub(paid);
      const daysSinceBilled = Math.floor(
        (now - order.billedAt!.getTime()) / DAY_MS,
      );
      const isOverdue = daysSinceBilled > order.client.paymentTermDays;

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        collectionNumber: order.collectionNumber,
        clientId: order.client.id,
        clientName: order.client.name,
        description: order.description,
        total: order.totalAmount!.toFixed(2),
        paid: paid.toFixed(2),
        balance: balance.toFixed(2),
        billedAt: order.billedAt!.toISOString(),
        daysSinceBilled,
        paymentTermDays: order.client.paymentTermDays,
        isOverdue,
        paymentStatus: order.paymentStatus,
      };
    });
  }

  /** GET /billing/by-client — saldo agregado por cliente, de mayor a menor. */
  async getByClient(companyId: string): Promise<ClientBalanceView[]> {
    const receivables = await this.getReceivables(companyId);

    const byClient = new Map<
      string,
      ClientBalanceView & { balanceDecimal: Prisma.Decimal }
    >();
    for (const receivable of receivables) {
      const existing = byClient.get(receivable.clientId);
      const amount = new Prisma.Decimal(receivable.balance);
      if (existing) {
        existing.balanceDecimal = existing.balanceDecimal.add(amount);
      } else {
        byClient.set(receivable.clientId, {
          clientId: receivable.clientId,
          clientName: receivable.clientName,
          balance: '0.00',
          balanceDecimal: amount,
        });
      }
    }

    return Array.from(byClient.values())
      .map(({ balanceDecimal, ...rest }) => ({
        ...rest,
        balance: balanceDecimal.toFixed(2),
      }))
      .sort((a, b) => Number(b.balance) - Number(a.balance));
  }
}
