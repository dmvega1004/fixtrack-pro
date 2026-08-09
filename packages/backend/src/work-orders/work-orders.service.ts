import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role, WorkOrder } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PrismaService } from '../prisma.service';
import { calculateBilling } from './billing.util';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

/**
 * Relaciones que acompañan a cada orden en las respuestas. `client` es el
 * vínculo principal (siempre presente); `equipmentLinks` viaja vía la
 * tabla intermedia WorkOrderEquipment — se aplana a `equipments` en
 * `toView()` porque Prisma no puede devolver un array plano directo desde
 * un include anidado. Cero equipos = servicio locativo.
 */
const WORK_ORDER_INCLUDE = {
  client: { select: { id: true, name: true } },
  equipmentLinks: {
    select: {
      equipment: {
        select: {
          id: true,
          brand: true,
          model: true,
          serialNumber: true,
          location: true,
          qrCode: true,
        },
      },
    },
  },
  user: { select: { id: true, name: true, email: true } },
} as const;

type WorkOrderWithRelations = Prisma.WorkOrderGetPayload<{
  include: typeof WORK_ORDER_INCLUDE;
}>;

export interface WorkOrderEquipmentSummary {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  location: string | null;
  qrCode: string;
}

/** Vista pública de una orden: WorkOrder + client/user incluidos + equipments ya aplanado. */
export type WorkOrderView = WorkOrder & {
  client: { id: string; name: string };
  user: { id: string; name: string; email: string } | null;
  equipments: WorkOrderEquipmentSummary[];
};

/** Estados terminales: una orden entregada o cancelada queda sellada. */
const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

/**
 * REGLA DE ORO MULTI-TENANT + RBAC FINO:
 * - Todos los métodos reciben el AuthenticatedUser completo (companyId,
 *   userId, role) y aplican el candado companyId en cada consulta.
 * - TECHNICIAN: su filtro de visibilidad (userId = él mismo) se inyecta
 *   DENTRO del `where` de Prisma — una orden ajena es un 404, ni siquiera
 *   puede saber que existe. Y solo puede editar status, diagnosis y observations.
 */
@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateWorkOrderDto,
  ): Promise<WorkOrderView> {
    // Validación cruzada: el cliente debe pertenecer a MI empresa
    await this.ensureClientBelongsToCompany(user.companyId, dto.clientId);

    // Si hay equipos, deben ser de MI empresa Y del cliente indicado
    // (coherencia: no se puede colgar la orden de un equipo de otro cliente).
    // Duplicados ya los rechaza el DTO (@ArrayUnique).
    const equipmentIds = dto.equipmentIds ?? [];
    if (equipmentIds.length > 0) {
      await this.ensureEquipmentsBelongToClient(
        user.companyId,
        equipmentIds,
        dto.clientId,
      );
    }

    // RBAC: un Técnico que crea una orden queda SIEMPRE autoasignado, sin
    // importar qué userId haya mandado en el body (no puede asignar a otros).
    const assignedUserId =
      user.role === Role.TECHNICIAN ? user.userId : dto.userId;

    // Si Admin/Coordinador asignan a alguien, ese alguien debe ser de MI empresa
    if (user.role !== Role.TECHNICIAN && assignedUserId) {
      await this.ensureUserBelongsToCompany(user.companyId, assignedUserId);
    }

    // A prueba de concurrencia: el consecutivo se saca DENTRO de la misma
    // transacción que crea la orden. El UPDATE con increment toma un lock
    // de fila sobre Company hasta el commit, así que dos creaciones
    // simultáneas para la misma empresa se serializan y nunca repiten
    // número (el @@unique([companyId, orderNumber]) es el respaldo final).
    const created = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id: user.companyId },
        data: { nextOrderNumber: { increment: 1 } },
        select: { nextOrderNumber: true },
      });

      return tx.workOrder.create({
        data: {
          orderNumber: company.nextOrderNumber - 1,
          description: dto.description.trim(),
          diagnosis: dto.diagnosis?.trim(),
          observations: dto.observations?.trim(),
          priority: dto.priority, // undefined → default MEDIUM
          clientId: dto.clientId,
          userId: assignedUserId,
          companyId: user.companyId, // candado
          // status: toda orden nace PENDING (default de Prisma)
          equipmentLinks:
            equipmentIds.length > 0
              ? {
                  createMany: {
                    data: equipmentIds.map((equipmentId) => ({
                      equipmentId,
                      companyId: user.companyId, // candado
                    })),
                  },
                }
              : undefined,
        },
        include: WORK_ORDER_INCLUDE,
      });
    });

    return this.toView(created);
  }

  async findAll(
    user: AuthenticatedUser,
    status?: OrderStatus,
  ): Promise<WorkOrderView[]> {
    const where: Prisma.WorkOrderWhereInput = {
      companyId: user.companyId, // candado
      // RBAC fino: el técnico SOLO ve sus órdenes asignadas
      ...(user.role === Role.TECHNICIAN ? { userId: user.userId } : {}),
      ...(status ? { status } : {}),
    };

    const orders = await this.prisma.workOrder.findMany({
      where,
      include: WORK_ORDER_INCLUDE,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return orders.map((order) => this.toView(order));
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<WorkOrderView> {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: {
        id,
        companyId: user.companyId, // candado
        // RBAC fino: para el técnico, una orden ajena no existe (404)
        ...(user.role === Role.TECHNICIAN ? { userId: user.userId } : {}),
      },
      include: WORK_ORDER_INCLUDE,
    });

    if (!workOrder) {
      throw new NotFoundException(`Orden de trabajo ${id} no encontrada`);
    }

    return this.toView(workOrder);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrderView> {
    // Pertenencia al tenant + visibilidad del técnico (404 si no aplica)
    const workOrder = await this.findOne(user, id);

    // Una orden entregada o cancelada queda sellada para todos
    if (TERMINAL_STATUSES.includes(workOrder.status)) {
      throw new ConflictException(
        `La orden está en estado terminal (${workOrder.status}) y no admite cambios`,
      );
    }

    // RBAC fino: el técnico solo puede tocar status, diagnosis y observations
    if (user.role === Role.TECHNICIAN) {
      const forbiddenFields: string[] = [];
      if (dto.description !== undefined) forbiddenFields.push('description');
      if (dto.priority !== undefined) forbiddenFields.push('priority');
      if (dto.clientId !== undefined) forbiddenFields.push('clientId');
      if (dto.equipmentIds !== undefined) forbiddenFields.push('equipmentIds');
      if (dto.userId !== undefined) forbiddenFields.push('userId');
      if (dto.laborAmount !== undefined) forbiddenFields.push('laborAmount');
      if (dto.additionalAmount !== undefined)
        forbiddenFields.push('additionalAmount');
      if (dto.additionalDescription !== undefined)
        forbiddenFields.push('additionalDescription');
      if (dto.discountAmount !== undefined)
        forbiddenFields.push('discountAmount');

      if (forbiddenFields.length > 0) {
        throw new ForbiddenException(
          `Como técnico solo puedes modificar status, diagnosis y observations. ` +
            `Campos no permitidos: ${forbiddenFields.join(', ')}`,
        );
      }
    }

    // RBAC financiero: solo ADMIN valoriza la orden — ni siquiera Coordinador.
    // (El técnico ya quedó bloqueado arriba; este check cubre a Coordinador.)
    if (user.role !== Role.ADMIN) {
      const forbiddenBillingFields: string[] = [];
      if (dto.laborAmount !== undefined)
        forbiddenBillingFields.push('laborAmount');
      if (dto.additionalAmount !== undefined)
        forbiddenBillingFields.push('additionalAmount');
      if (dto.additionalDescription !== undefined)
        forbiddenBillingFields.push('additionalDescription');
      if (dto.discountAmount !== undefined)
        forbiddenBillingFields.push('discountAmount');

      if (forbiddenBillingFields.length > 0) {
        throw new ForbiddenException(
          `Solo un ADMIN puede modificar la valorización de la orden. ` +
            `Campos no permitidos: ${forbiddenBillingFields.join(', ')}`,
        );
      }
    }

    // Validación cruzada de relaciones si Admin/Coordinador las cambia
    if (dto.clientId) {
      await this.ensureClientBelongsToCompany(user.companyId, dto.clientId);
    }
    // Coherencia equipos/cliente: si cambian los equipos (o solo el cliente,
    // con equipos ya existentes en la orden), los equipos resultantes deben
    // ser del cliente resultante. Duplicados ya los rechaza el DTO.
    if (dto.equipmentIds !== undefined && dto.equipmentIds.length > 0) {
      await this.ensureEquipmentsBelongToClient(
        user.companyId,
        dto.equipmentIds,
        dto.clientId ?? workOrder.clientId,
      );
    }
    if (dto.userId) {
      await this.ensureUserBelongsToCompany(user.companyId, dto.userId);
    }

    // Congelamiento contable: al (re)pasar la orden a COMPLETED se
    // fotografía el total con los montos vigentes en ESTE update (los que
    // trae el dto, o si no los envía, los que ya tenía la orden) — igual
    // que unitCost/unitPrice en WorkOrderPart. A partir de ahí el total no
    // se recalcula aunque cambien los precios del inventario o el IVA de
    // la empresa, porque totalAmount queda guardado como columna, no
    // derivado. Reenviar status COMPLETED (ej. tras corregir un monto)
    // vuelve a congelar con los valores del momento.
    let freeze:
      | {
          taxRateApplied: Prisma.Decimal;
          totalAmount: Prisma.Decimal;
          billedAt: Date;
        }
      | undefined;

    if (dto.status === OrderStatus.COMPLETED) {
      const [company, parts] = await Promise.all([
        this.prisma.company.findUniqueOrThrow({
          where: { id: user.companyId },
          select: { taxRate: true },
        }),
        this.prisma.workOrderPart.findMany({
          where: { workOrderId: id, companyId: user.companyId },
          select: { unitPrice: true, quantity: true },
        }),
      ]);

      const partsTotal = parts.reduce(
        (acc, p) => acc.add(p.unitPrice.mul(p.quantity)),
        new Prisma.Decimal(0),
      );

      const { total } = calculateBilling({
        laborAmount:
          dto.laborAmount !== undefined
            ? new Prisma.Decimal(dto.laborAmount)
            : workOrder.laborAmount,
        partsTotal,
        additionalAmount:
          dto.additionalAmount !== undefined
            ? new Prisma.Decimal(dto.additionalAmount)
            : workOrder.additionalAmount,
        discountAmount:
          dto.discountAmount !== undefined
            ? new Prisma.Decimal(dto.discountAmount)
            : workOrder.discountAmount,
        taxRate: company.taxRate,
      });

      freeze = {
        taxRateApplied: company.taxRate,
        totalAmount: total,
        billedAt: new Date(),
      };
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        description: dto.description?.trim(),
        diagnosis: dto.diagnosis?.trim(),
        observations: dto.observations?.trim(),
        status: dto.status,
        priority: dto.priority,
        clientId: dto.clientId,
        userId: dto.userId,
        laborAmount: dto.laborAmount,
        additionalAmount: dto.additionalAmount,
        additionalDescription: dto.additionalDescription?.trim(),
        discountAmount: dto.discountAmount,
        // Reemplaza el set completo de equipos de la orden (semántica PATCH):
        // borra los vínculos actuales y crea los del array recibido. Un
        // array vacío es válido y explícito: deja la orden sin equipos
        // (servicio locativo). `undefined` (campo omitido) no toca nada.
        ...(dto.equipmentIds !== undefined && {
          equipmentLinks: {
            deleteMany: {},
            createMany: {
              data: dto.equipmentIds.map((equipmentId) => ({
                equipmentId,
                companyId: user.companyId, // candado
              })),
            },
          },
        }),
        ...(freeze && {
          taxRateApplied: freeze.taxRateApplied,
          totalAmount: freeze.totalAmount,
          billedAt: freeze.billedAt,
        }),
      },
      include: WORK_ORDER_INCLUDE,
    });

    return this.toView(updated);
  }

  /**
   * DELETE /work-orders/:id — SOLO ADMIN (RBAC en el controller). Acción
   * destructiva irreversible sobre un documento contable:
   * - Devuelve al inventario el stock de cada repuesto consumido (si no, el
   *   inventario queda descuadrado permanentemente).
   * - Pagos, adjuntos y vínculos de equipos se borran en cascada (ver
   *   onDelete: Cascade en schema.prisma).
   * - Las fotos en Cloudinary se borran DESPUÉS de confirmar la transacción,
   *   best-effort: un fallo ahí no debe dejar la orden a medio borrar.
   */
  async remove(user: AuthenticatedUser, id: string): Promise<WorkOrderView> {
    // El guard @Roles(ADMIN) ya filtró el rol; verificamos tenant + existencia
    const order = await this.findOne(user, id);

    const attachments = await this.prisma.attachment.findMany({
      where: { workOrderId: id, companyId: user.companyId }, // candado
      select: { publicId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const parts = await tx.workOrderPart.findMany({
        where: { workOrderId: id, companyId: user.companyId }, // candado
        select: { sparePartId: true, quantity: true },
      });

      for (const part of parts) {
        await tx.sparePart.update({
          where: { id: part.sparePartId },
          data: { stock: { increment: part.quantity } },
        });
      }

      // Sin onDelete: Cascade en WorkOrderPart (es historial contable de
      // costos/precios), así que hay que vaciarlo explícitamente antes de
      // poder borrar la orden. Payment, Attachment y WorkOrderEquipment sí
      // tienen Cascade en el schema.
      await tx.workOrderPart.deleteMany({
        where: { workOrderId: id, companyId: user.companyId },
      });

      await tx.workOrder.delete({ where: { id } });
    });

    for (const attachment of attachments) {
      try {
        await this.cloudinary.destroy(attachment.publicId);
      } catch (error) {
        this.logger.error(
          `Fallo al borrar foto de Cloudinary (orden ${id}, publicId ${attachment.publicId}): ${
            error instanceof Error ? error.message : String(error)
          }`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return order;
  }

  /** Validación cruzada multi-tenant de la relación WorkOrder → Client. */
  private async ensureClientBelongsToCompany(
    companyId: string,
    clientId: string,
  ): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId }, // candado
      select: { id: true },
    });

    if (!client) {
      throw new NotFoundException(
        `Cliente ${clientId} no encontrado en tu empresa`,
      );
    }
  }

  /**
   * Validación cruzada multi-tenant + de coherencia de la relación
   * WorkOrder → Equipment: cada equipo debe ser de MI empresa Y del
   * cliente indicado (no se puede colgar la orden de un equipo de otro
   * cliente). Una orden puede abarcar varios equipos del mismo cliente.
   */
  private async ensureEquipmentsBelongToClient(
    companyId: string,
    equipmentIds: string[],
    clientId: string,
  ): Promise<void> {
    const equipments = await this.prisma.equipment.findMany({
      where: { id: { in: equipmentIds }, companyId }, // candado
      select: { id: true, clientId: true },
    });

    const foundIds = new Set(equipments.map((equipment) => equipment.id));
    const missingIds = equipmentIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Equipo(s) no encontrado(s) en tu empresa: ${missingIds.join(', ')}`,
      );
    }

    const mismatched = equipments.filter(
      (equipment) => equipment.clientId !== clientId,
    );
    if (mismatched.length > 0) {
      throw new ConflictException(
        `Los equipos ${mismatched.map((equipment) => equipment.id).join(', ')} no pertenecen al cliente ${clientId}`,
      );
    }
  }

  /** Validación cruzada multi-tenant de la relación WorkOrder → User (técnico). */
  private async ensureUserBelongsToCompany(
    companyId: string,
    userId: string,
  ): Promise<void> {
    const assignee = await this.prisma.user.findFirst({
      where: { id: userId, companyId }, // candado
      select: { id: true },
    });

    if (!assignee) {
      throw new NotFoundException(
        `Usuario ${userId} no encontrado en tu empresa`,
      );
    }
  }

  /**
   * Aplana `equipmentLinks` (filas de la tabla intermedia, cada una con su
   * `equipment` anidado) a `equipments`: un array plano de equipos, que es
   * la forma que consume el frontend. Prisma no ofrece un include que
   * devuelva esto directo porque la relación es explícita (tiene columnas
   * propias: companyId, createdAt), no un m-a-m implícito.
   */
  private toView(order: WorkOrderWithRelations): WorkOrderView {
    const { equipmentLinks, ...rest } = order;
    return {
      ...rest,
      equipments: equipmentLinks.map((link) => link.equipment),
    };
  }
}
