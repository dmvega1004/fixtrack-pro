import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role, WorkOrder } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

/**
 * Relaciones que acompañan a cada orden en las respuestas. `client` es el
 * vínculo principal (siempre presente); `equipment` es opcional — las
 * órdenes de servicio locativo no tienen equipo asociado y el campo llega
 * como `null` a los consumidores.
 */
const WORK_ORDER_INCLUDE = {
  client: { select: { id: true, name: true } },
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
  user: { select: { id: true, name: true, email: true } },
} as const;

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
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateWorkOrderDto,
  ): Promise<WorkOrder> {
    // Validación cruzada: el cliente debe pertenecer a MI empresa
    await this.ensureClientBelongsToCompany(user.companyId, dto.clientId);

    // Si hay equipo, debe ser de MI empresa Y del cliente indicado
    // (coherencia: no se puede colgar la orden de un equipo de otro cliente).
    if (dto.equipmentId) {
      await this.ensureEquipmentBelongsToClient(
        user.companyId,
        dto.equipmentId,
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
    return this.prisma.$transaction(async (tx) => {
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
          equipmentId: dto.equipmentId,
          userId: assignedUserId,
          companyId: user.companyId, // candado
          // status: toda orden nace PENDING (default de Prisma)
        },
        include: WORK_ORDER_INCLUDE,
      });
    });
  }

  findAll(user: AuthenticatedUser, status?: OrderStatus): Promise<WorkOrder[]> {
    const where: Prisma.WorkOrderWhereInput = {
      companyId: user.companyId, // candado
      // RBAC fino: el técnico SOLO ve sus órdenes asignadas
      ...(user.role === Role.TECHNICIAN ? { userId: user.userId } : {}),
      ...(status ? { status } : {}),
    };

    return this.prisma.workOrder.findMany({
      where,
      include: WORK_ORDER_INCLUDE,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<WorkOrder> {
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

    return workOrder;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrder> {
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
      if (dto.equipmentId !== undefined) forbiddenFields.push('equipmentId');
      if (dto.userId !== undefined) forbiddenFields.push('userId');

      if (forbiddenFields.length > 0) {
        throw new ForbiddenException(
          `Como técnico solo puedes modificar status, diagnosis y observations. ` +
            `Campos no permitidos: ${forbiddenFields.join(', ')}`,
        );
      }
    }

    // Validación cruzada de relaciones si Admin/Coordinador las cambia
    if (dto.clientId) {
      await this.ensureClientBelongsToCompany(user.companyId, dto.clientId);
    }
    // Coherencia equipo/cliente: si cambia el equipo (o solo el cliente, con
    // un equipo ya existente en la orden), el equipo resultante debe ser del
    // cliente resultante.
    if (dto.equipmentId) {
      await this.ensureEquipmentBelongsToClient(
        user.companyId,
        dto.equipmentId,
        dto.clientId ?? workOrder.clientId,
      );
    }
    if (dto.userId) {
      await this.ensureUserBelongsToCompany(user.companyId, dto.userId);
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        description: dto.description?.trim(),
        diagnosis: dto.diagnosis?.trim(),
        observations: dto.observations?.trim(),
        status: dto.status,
        priority: dto.priority,
        clientId: dto.clientId,
        equipmentId: dto.equipmentId,
        userId: dto.userId,
      },
      include: WORK_ORDER_INCLUDE,
    });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<WorkOrder> {
    // El guard @Roles(ADMIN) ya filtró el rol; verificamos tenant
    await this.findOne(user, id);
    return this.prisma.workOrder.delete({
      where: { id },
      include: WORK_ORDER_INCLUDE,
    });
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
   * WorkOrder → Equipment: el equipo debe ser de MI empresa Y del cliente
   * indicado (no se puede colgar la orden de un equipo de otro cliente).
   */
  private async ensureEquipmentBelongsToClient(
    companyId: string,
    equipmentId: string,
    clientId: string,
  ): Promise<void> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id: equipmentId, companyId }, // candado
      select: { id: true, clientId: true },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipo ${equipmentId} no encontrado en tu empresa`,
      );
    }

    if (equipment.clientId !== clientId) {
      throw new ConflictException(
        `El equipo ${equipmentId} no pertenece al cliente ${clientId}`,
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
}
