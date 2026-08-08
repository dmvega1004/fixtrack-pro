import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Payment, PaymentStatus, Prisma } from 'database';
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
  ) {}

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

    if (order.totalAmount === null) {
      throw new ConflictException(
        'La orden no tiene un total congelado: valorízala y ciérrala antes de registrar pagos',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const paidAgg = await tx.payment.aggregate({
        where: { workOrderId, companyId: user.companyId }, // candado
        _sum: { amount: true },
      });
      const alreadyPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
      const balance = order.totalAmount!.sub(alreadyPaid);

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
            order.totalAmount!,
            alreadyPaid.add(amount),
          ),
        },
      });

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

    const order = await this.prisma.workOrder.findUniqueOrThrow({
      where: { id: payment.workOrderId },
      select: { totalAmount: true },
    });

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
          paymentStatus: order.totalAmount
            ? derivePaymentStatus(order.totalAmount, remaining)
            : PaymentStatus.PENDING, // sin total congelado no hay forma de derivar: vuelve al default
        },
      });

      return payment;
    });
  }
}
