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

/**
 * Módulo de Cobros (solo ADMIN, ver @Roles en BillingController): indicadores
 * de facturación/cobro y cartera. "Cuentas por cobrar" = órdenes cerradas
 * (totalAmount congelado) cuyo paymentStatus todavía no es PAID.
 */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string): Promise<BillingSummary> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [billedAgg, collectedAgg, receivables, recentPayments] =
      await Promise.all([
        this.prisma.workOrder.aggregate({
          where: { companyId, billedAt: { gte: startOfMonth } }, // candado
          _sum: { totalAmount: true },
        }),
        this.prisma.payment.aggregate({
          where: { companyId, paidAt: { gte: startOfMonth } }, // candado
          _sum: { amount: true },
        }),
        this.getReceivables(companyId),
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

    const totalReceivable = receivables.reduce(
      (acc, r) => acc.add(r.balance),
      new Prisma.Decimal(0),
    );
    const totalOverdue = receivables
      .filter((r) => r.isOverdue)
      .reduce((acc, r) => acc.add(r.balance), new Prisma.Decimal(0));

    return {
      billedThisMonth: (
        billedAgg._sum.totalAmount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      collectedThisMonth: (
        collectedAgg._sum.amount ?? new Prisma.Decimal(0)
      ).toFixed(2),
      totalReceivable: totalReceivable.toFixed(2),
      totalOverdue: totalOverdue.toFixed(2),
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
