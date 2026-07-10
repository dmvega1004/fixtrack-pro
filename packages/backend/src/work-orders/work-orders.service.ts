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

/** Relaciones que acompañan a cada orden en las respuestas. */
const WORK_ORDER_INCLUDE = {
  equipment: {
    select: {
      id: true,
      brand: true,
      model: true,
      qrCode: true,
      client: { select: { id: true, name: true } },
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
 *   puede saber que existe. Y solo puede editar status y diagnosis.
 */
@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateWorkOrderDto,
  ): Promise<WorkOrder> {
    // Validación cruzada: el equipo debe pertenecer a MI empresa
    await this.ensureEquipmentBelongsToCompany(user.companyId, dto.equipmentId);

    // Si se asigna técnico desde la creación, también debe ser de MI empresa
    if (dto.userId) {
      await this.ensureUserBelongsToCompany(user.companyId, dto.userId);
    }

    return this.prisma.workOrder.create({
      data: {
        description: dto.description.trim(),
        diagnosis: dto.diagnosis?.trim(),
        priority: dto.priority, // undefined → default MEDIUM
        equipmentId: dto.equipmentId,
        userId: dto.userId,
        companyId: user.companyId, // candado
        // status: toda orden nace PENDING (default de Prisma)
      },
      include: WORK_ORDER_INCLUDE,
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

    // RBAC fino: el técnico solo puede tocar status y diagnosis
    if (user.role === Role.TECHNICIAN) {
      const forbiddenFields: string[] = [];
      if (dto.description !== undefined) forbiddenFields.push('description');
      if (dto.priority !== undefined) forbiddenFields.push('priority');
      if (dto.equipmentId !== undefined) forbiddenFields.push('equipmentId');
      if (dto.userId !== undefined) forbiddenFields.push('userId');

      if (forbiddenFields.length > 0) {
        throw new ForbiddenException(
          `Como técnico solo puedes modificar status y diagnosis. ` +
            `Campos no permitidos: ${forbiddenFields.join(', ')}`,
        );
      }
    }

    // Validación cruzada de relaciones si Admin/Coordinador las cambia
    if (dto.equipmentId) {
      await this.ensureEquipmentBelongsToCompany(
        user.companyId,
        dto.equipmentId,
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
        status: dto.status,
        priority: dto.priority,
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

  /** Validación cruzada multi-tenant de la relación WorkOrder → Equipment. */
  private async ensureEquipmentBelongsToCompany(
    companyId: string,
    equipmentId: string,
  ): Promise<void> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id: equipmentId, companyId }, // candado
      select: { id: true },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Equipo ${equipmentId} no encontrado en tu empresa`,
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
