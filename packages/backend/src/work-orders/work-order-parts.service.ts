import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Role,
  WorkOrder,
  WorkOrderItem,
  WorkOrderPart,
} from 'database';
import { activityAuthorName } from '../activity/activity-labels';
import { ActivityService } from '../activity/activity.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { calculateBilling } from './billing.util';
import { AddWorkOrderPartDto } from './dto/add-work-order-part.dto';
import { WorkOrdersService } from './work-orders.service';

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

const PART_SUMMARY = {
  sparePart: {
    select: { id: true, sku: true, name: true, trackStock: true },
  },
} as const;

/**
 * Línea de repuesto con unitCost/unitPrice opcionalmente omitidos (RBAC
 * financiero): unitCost solo para ADMIN; unitPrice también se omite para
 * TECHNICIAN (ve qué repuesto y cuánta cantidad, nunca el precio).
 */
export type WorkOrderPartView = Omit<
  WorkOrderPart,
  'unitCost' | 'unitPrice'
> & {
  unitCost?: WorkOrderPart['unitCost'];
  unitPrice?: WorkOrderPart['unitPrice'];
};

/**
 * Cierre económico de la orden (pestaña «Valores»). Los montos son precios
 * al cliente, no costos — visibles para ADMIN/COORDINATOR (aparecen en el
 * documento que se entrega); solo ADMIN puede editarlos (PATCH
 * /work-orders/:id). TECHNICIAN no recibe este bloque en absoluto (ver
 * WorkOrderPartsService.listParts).
 */
export interface WorkOrderBilling {
  laborAmount: string;
  additionalAmount: string;
  additionalDescription: string | null;
  discountAmount: string;
  subtotal: string;
  /** Tasa efectivamente usada: la congelada si la orden ya cerró, si no la vigente de la empresa. */
  taxRate: string;
  taxAmount: string;
  /** Congelado (no se recalcula) si la orden ya pasó por COMPLETED; si no, calculado en vivo. */
  total: string;
  isFrozen: boolean;
  billedAt: string | null;
  paymentStatus: PaymentStatus;
  /**
   * Suma de abonos registrados (Payment). El módulo de cartera (siguiente
   * entrega) tendrá su propia vista de cobros; por ahora esto solo alcanza
   * para mostrar el saldo pendiente en el documento impreso.
   */
  paidAmount: string;
}

export interface WorkOrderPartsSummary {
  items: WorkOrderPartView[];
  /**
   * Total de repuestos a cobrar al cliente (suma de quantity × unitPrice).
   * Omitido para TECHNICIAN — mismo criterio RBAC financiero que
   * WorkOrderPartView.unitPrice: es un valor monetario derivado de precios
   * que el técnico no debe ver.
   */
  totalSale?: string;
  /** Costo total para la empresa — SOLO visible para ADMIN. */
  totalCost?: string;
  /**
   * Conceptos de valorización (desglose del cobro, ver WorkOrderItem) —
   * omitido para TECHNICIAN, igual que `billing`: es información
   * financiera, no algo que un técnico deba recibir del servidor.
   */
  concepts?: WorkOrderItem[];
  /** Desglose económico de la orden — omitido para TECHNICIAN (ver totalSale). */
  billing?: WorkOrderBilling;
  /**
   * Costos internos (bloque "Costos internos", pestaña «Valores») — lo que
   * el trabajo costó fuera del inventario. SOLO visible para ADMIN, igual
   * que totalCost: nunca se factura al cliente ni aparece en ningún
   * documento impreso, así que ni siquiera viaja en la respuesta para
   * COORDINATOR/TECHNICIAN.
   */
  directCostAmount?: string;
  directCostDescription?: string | null;
}

/**
 * Pestaña «Repuestos» de la orden (Módulo 6): vincula inventario con
 * órdenes de trabajo y mantiene el stock cuadrado en tiempo real.
 *
 * Reglas:
 * - La visibilidad de la orden la decide WorkOrdersService.findOne
 *   (el técnico solo llega a SUS órdenes; candado multi-tenant incluido).
 * - Órdenes en estado terminal no admiten cambios de repuestos.
 * - El descuento de stock es transaccional y a prueba de carreras:
 *   UPDATE condicional (stock >= cantidad) dentro de $transaction.
 * - unitCost/unitPrice son FOTOGRAFÍAS del precio al momento del uso:
 *   el historial contable no cambia si el catálogo cambia después.
 */
@Injectable()
export class WorkOrderPartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityService: ActivityService,
  ) {}

  async addPart(
    user: AuthenticatedUser,
    workOrderId: string,
    dto: AddWorkOrderPartDto,
  ): Promise<WorkOrderPartView> {
    const order = await this.workOrdersService.findOne(user, workOrderId);
    this.ensureNotTerminal(order.status);

    const line = await this.prisma.$transaction(async (tx) => {
      // Validación cruzada: el repuesto debe ser de MI empresa
      const part = await tx.sparePart.findFirst({
        where: { id: dto.sparePartId, companyId: user.companyId },
      });

      if (!part) {
        throw new NotFoundException(
          `Repuesto ${dto.sparePartId} no encontrado en tu empresa`,
        );
      }

      // "Contra pedido" (trackStock=false): no se mantiene en bodega, así
      // que ni se valida stock suficiente ni se descuenta. Pedir contra
      // pedido significa, literalmente, que no hay existencias.
      if (part.trackStock) {
        // Descuento atómico y a prueba de carreras: solo descuenta si alcanza
        const decremented = await tx.sparePart.updateMany({
          where: {
            id: part.id,
            companyId: user.companyId,
            stock: { gte: dto.quantity },
          },
          data: { stock: { decrement: dto.quantity } },
        });

        if (decremented.count === 0) {
          throw new ConflictException(
            `Stock insuficiente de ${part.sku}: quedan ${part.stock} unidades ` +
              `y se solicitaron ${dto.quantity}`,
          );
        }
      }

      // Línea de la orden: crea con fotografía de precios, o suma cantidad
      const result = await tx.workOrderPart.upsert({
        where: {
          workOrderId_sparePartId: {
            workOrderId,
            sparePartId: part.id,
          },
        },
        create: {
          workOrderId,
          sparePartId: part.id,
          quantity: dto.quantity,
          unitCost: part.cost, // fotografía del costo actual
          unitPrice: part.salePrice, // fotografía del precio actual
          companyId: user.companyId, // candado
        },
        update: {
          quantity: { increment: dto.quantity },
        },
        include: PART_SUMMARY,
      });

      // isFinancial: false — el técnico SÍ ve que se movieron repuestos
      // (es operativo suyo), pero NUNCA precios ni subtotales: solo nombre
      // y cantidad, nada de part.cost/part.salePrice acá.
      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.PART_ADDED,
          newValue: `${part.name} ×${dto.quantity}`,
          isFinancial: false,
        },
        tx,
      );

      return result;
    });

    return this.redact(line, user.role);
  }

  async removePart(
    user: AuthenticatedUser,
    workOrderId: string,
    sparePartId: string,
  ): Promise<WorkOrderPartView> {
    const order = await this.workOrdersService.findOne(user, workOrderId);
    this.ensureNotTerminal(order.status);

    const line = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.workOrderPart.findFirst({
        where: { workOrderId, sparePartId, companyId: user.companyId }, // candado
        include: PART_SUMMARY,
      });

      if (!existing) {
        throw new NotFoundException(
          'Ese repuesto no está registrado en esta orden',
        );
      }

      await tx.workOrderPart.delete({ where: { id: existing.id } });

      // Devolución del stock: el inventario queda cuadrado. "Contra pedido"
      // (trackStock=false) nunca movió stock al agregarse, así que tampoco
      // se le devuelve nada acá (si no, se crean existencias fantasma).
      if (existing.sparePart.trackStock) {
        await tx.sparePart.update({
          where: { id: sparePartId },
          data: { stock: { increment: existing.quantity } },
        });
      }

      // isFinancial: false — mismo criterio que PART_ADDED: solo nombre y
      // cantidad, nunca unitCost/unitPrice.
      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.PART_REMOVED,
          oldValue: `${existing.sparePart.name} ×${existing.quantity}`,
          isFinancial: false,
        },
        tx,
      );

      return existing;
    });

    return this.redact(line, user.role);
  }

  async listParts(
    user: AuthenticatedUser,
    workOrderId: string,
  ): Promise<WorkOrderPartsSummary> {
    // Visibilidad + candado (404 si la orden es ajena o de otro técnico)
    const order = await this.workOrdersService.findOne(user, workOrderId);

    const [lines, concepts, company, paidAgg] = await Promise.all([
      this.prisma.workOrderPart.findMany({
        where: { workOrderId, companyId: user.companyId }, // candado
        include: PART_SUMMARY,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.workOrderItem.findMany({
        where: { workOrderId, companyId: user.companyId }, // candado
        orderBy: { position: 'asc' },
      }),
      this.prisma.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { taxRate: true },
      }),
      this.prisma.payment.aggregate({
        where: { workOrderId, companyId: user.companyId }, // candado
        _sum: { amount: true },
      }),
    ]);

    const totalSale = lines.reduce(
      (acc, l) => acc.add(l.unitPrice.mul(l.quantity)),
      new Prisma.Decimal(0),
    );
    const itemsTotal = concepts.reduce(
      (acc, c) => acc.add(c.unitPrice.mul(c.quantity)),
      new Prisma.Decimal(0),
    );
    const paidAmount = paidAgg._sum.amount ?? new Prisma.Decimal(0);

    const summary: WorkOrderPartsSummary = {
      items: lines.map((l) => this.redact(l, user.role)),
    };

    // RBAC financiero: TECHNICIAN no recibe ningún valor monetario — ni el
    // subtotal de repuestos ni los conceptos ni el desglose económico de
    // la orden.
    if (user.role !== Role.TECHNICIAN) {
      summary.totalSale = totalSale.toFixed(2);
      summary.concepts = concepts;
      // El role check de arriba garantiza que `order` (mismo user, ver
      // WorkOrdersService.toView) trae estos campos sin redactar.
      summary.billing = this.buildBilling(
        order as Pick<
          WorkOrder,
          | 'laborAmount'
          | 'additionalAmount'
          | 'additionalDescription'
          | 'discountAmount'
          | 'totalAmount'
          | 'taxRateApplied'
          | 'billedAt'
          | 'paymentStatus'
        >,
        totalSale,
        itemsTotal,
        company.taxRate,
        paidAmount,
      );
    }

    // RBAC financiero: el costo total y los costos internos solo los ve el ADMIN
    if (user.role === Role.ADMIN) {
      const totalCost = lines.reduce(
        (acc, l) => acc.add(l.unitCost.mul(l.quantity)),
        new Prisma.Decimal(0),
      );
      summary.totalCost = totalCost.toFixed(2);
      // order viene de WorkOrdersService.findOne(user, ...) con este mismo
      // user ADMIN, así que directCostAmount/Description ya vienen sin
      // redactar (ver WorkOrdersService.toView).
      summary.directCostAmount = order.directCostAmount!.toFixed(2);
      summary.directCostDescription = order.directCostDescription ?? null;
    }

    return summary;
  }

  /**
   * Arma el desglose económico. Si la orden ya está congelada (totalAmount
   * no nulo), el TOTAL mostrado es siempre el valor guardado — nunca se
   * recalcula, ni con el IVA actual de la empresa ni si cambian los
   * repuestos después del cierre; subtotal/impuesto se recomputan con la
   * tasa congelada solo para mostrar el desglose, no para derivar el total.
   */
  private buildBilling(
    order: Pick<
      WorkOrder,
      | 'laborAmount'
      | 'additionalAmount'
      | 'additionalDescription'
      | 'discountAmount'
      | 'totalAmount'
      | 'taxRateApplied'
      | 'billedAt'
      | 'paymentStatus'
    >,
    partsTotal: Prisma.Decimal,
    itemsTotal: Prisma.Decimal,
    companyTaxRate: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
  ): WorkOrderBilling {
    const isFrozen = order.totalAmount !== null;
    const taxRate = isFrozen ? order.taxRateApplied! : companyTaxRate;

    const { subtotal, taxAmount, total } = calculateBilling({
      laborAmount: order.laborAmount,
      partsTotal,
      itemsTotal,
      additionalAmount: order.additionalAmount,
      discountAmount: order.discountAmount,
      taxRate,
    });

    return {
      laborAmount: order.laborAmount.toFixed(2),
      additionalAmount: order.additionalAmount.toFixed(2),
      additionalDescription: order.additionalDescription,
      discountAmount: order.discountAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: isFrozen ? order.totalAmount!.toFixed(2) : total.toFixed(2),
      isFrozen,
      billedAt: order.billedAt ? order.billedAt.toISOString() : null,
      paymentStatus: order.paymentStatus,
      paidAmount: paidAmount.toFixed(2),
    };
  }

  private ensureNotTerminal(status: OrderStatus): void {
    if (TERMINAL_STATUSES.includes(status)) {
      throw new ConflictException(
        `La orden está en estado terminal (${status}): sus repuestos son historial contable y no admiten cambios`,
      );
    }
  }

  /**
   * RBAC financiero: unitCost solo para ADMIN; unitPrice se omite además
   * para TECHNICIAN (sigue viendo qué repuesto y cuánta cantidad, nunca
   * ningún valor monetario).
   */
  private redact(line: WorkOrderPart, role: Role): WorkOrderPartView {
    if (role === Role.ADMIN) {
      return line;
    }
    const { unitCost: _unitCost, ...rest } = line;
    if (role === Role.TECHNICIAN) {
      const { unitPrice: _unitPrice, ...withoutPrice } = rest;
      return withoutPrice;
    }
    return rest;
  }
}
