import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  OrderStatus,
  Payment,
  PaymentStatus,
  Prisma,
} from 'database';
import {
  ACTIVITY_PAYMENT_METHOD_LABELS,
  activityAuthorName,
  formatActivityCurrency,
} from '../activity/activity-labels';
import { ActivityService } from '../activity/activity.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { derivePaymentStatus } from '../work-orders/billing.util';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

/** Solo las órdenes cerradas (ya facturadas) admiten registro de pagos. */
const CLOSED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
];

const PAYMENT_INCLUDE = {
  registeredBy: { select: { id: true, name: true } },
} as const;

export type PaymentView = Payment & {
  registeredBy: { id: string; name: string } | null;
};

/**
 * Módulo de Cobros (solo ADMIN, ver @Roles en los controllers): registra
 * abonos contra una orden cerrada y mantiene WorkOrder.paymentStatus
 * derivado — nunca se guarda un delta, siempre se recalcula desde la suma
 * real de Payment dentro de la misma transacción que crea/borra el pago.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityService: ActivityService,
  ) {}

  /** "$150.000 · Transferencia (Ref. ABC123)" para el evento de bitácora del pago. */
  private describePayment(
    amount: Prisma.Decimal,
    method: Payment['method'],
    reference: string | null,
    currency: string,
  ): string {
    const amountLabel = formatActivityCurrency(amount, currency);
    const methodLabel = ACTIVITY_PAYMENT_METHOD_LABELS[method];
    const referenceSuffix = reference ? ` (Ref. ${reference})` : '';
    return `${amountLabel} · ${methodLabel}${referenceSuffix}`;
  }

  async create(
    user: AuthenticatedUser,
    workOrderId: string,
    dto: CreatePaymentDto,
  ): Promise<PaymentView> {
    // Visibilidad + candado (404 si la orden es ajena); ADMIN ve todas las de su empresa.
    const order = await this.workOrdersService.findOne(user, workOrderId);

    if (!CLOSED_STATUSES.includes(order.status)) {
      throw new ConflictException(
        'Solo se pueden registrar pagos en órdenes cerradas (COMPLETED o DELIVERED)',
      );
    }

    if (order.netAmount === null || order.netAmount === undefined) {
      throw new ConflictException(
        'La orden no tiene un total congelado: valorízala y ciérrala antes de registrar pagos',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { currency: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const paidAgg = await tx.payment.aggregate({
        where: { workOrderId, companyId: user.companyId }, // candado
        _sum: { amount: true },
      });
      const alreadyPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
      // netAmount, NUNCA totalAmount: es lo que el cliente REALMENTE va a
      // consignar (total menos retenciones) — si se usara totalAmount, una
      // orden con retenciones jamás llegaría a saldo cero.
      const balance = order.netAmount!.sub(alreadyPaid);

      if (amount.gt(balance)) {
        throw new ConflictException(
          `El monto (${amount.toFixed(2)}) excede el saldo pendiente (${balance.toFixed(2)})`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          workOrderId,
          companyId: user.companyId, // candado
          amount,
          paidAt: new Date(dto.paidAt),
          method: dto.method,
          reference: dto.reference?.trim(),
          notes: dto.notes?.trim(),
          registeredById: user.userId,
        },
        include: PAYMENT_INCLUDE,
      });

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          paymentStatus: derivePaymentStatus(
            order.netAmount!,
            alreadyPaid.add(amount),
          ),
        },
      });

      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.PAYMENT_REGISTERED,
          newValue: this.describePayment(
            payment.amount,
            payment.method,
            payment.reference,
            company.currency,
          ),
          isFinancial: true,
        },
        tx,
      );

      return payment;
    });
  }

  async listByWorkOrder(
    user: AuthenticatedUser,
    workOrderId: string,
  ): Promise<PaymentView[]> {
    // Visibilidad + candado (404 si la orden es ajena o de otra empresa)
    await this.workOrdersService.findOne(user, workOrderId);

    return this.prisma.payment.findMany({
      where: { workOrderId, companyId: user.companyId }, // candado
      include: PAYMENT_INCLUDE,
      orderBy: { paidAt: 'desc' },
    });
  }

  async remove(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<PaymentView> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, companyId: user.companyId }, // candado
      include: PAYMENT_INCLUDE,
    });

    if (!payment) {
      throw new NotFoundException(`Pago ${paymentId} no encontrado`);
    }

    const [order, company] = await Promise.all([
      this.prisma.workOrder.findUniqueOrThrow({
        where: { id: payment.workOrderId },
        select: { netAmount: true },
      }),
      this.prisma.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { currency: true },
      }),
    ]);

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.delete({ where: { id: paymentId } });

      const paidAgg = await tx.payment.aggregate({
        where: { workOrderId: payment.workOrderId, companyId: user.companyId },
        _sum: { amount: true },
      });
      const remaining = paidAgg._sum.amount ?? new Prisma.Decimal(0);

      await tx.workOrder.update({
        where: { id: payment.workOrderId },
        data: {
          paymentStatus: order.netAmount
            ? derivePaymentStatus(order.netAmount, remaining)
            : PaymentStatus.PENDING, // sin total congelado no hay forma de derivar: vuelve al default
        },
      });

      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId: payment.workOrderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.PAYMENT_DELETED,
          oldValue: this.describePayment(
            payment.amount,
            payment.method,
            payment.reference,
            company.currency,
          ),
          isFinancial: true,
        },
        tx,
      );

      return payment;
    });
  }
}
