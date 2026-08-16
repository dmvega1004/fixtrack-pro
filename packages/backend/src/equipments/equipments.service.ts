import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Equipment, Prisma, Role } from 'database';
import {
  addDaysUTC,
  addMonthsUTC,
  diffDaysUTC,
  parseDateOnly,
  todayDateOnly,
} from '../common/date-only.util';
import { PrismaService } from '../prisma.service';
import { ActivateMaintenanceBatchDto } from './dto/activate-maintenance-batch.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { MAINTENANCE_DUE_WINDOW_DAYS } from './maintenance-window';

/** Datos mínimos del cliente que acompañan a cada equipo en las respuestas. */
const CLIENT_SUMMARY = {
  client: { select: { id: true, name: true } },
} as const;

/** findAll además trae el conteo de órdenes (agregado en SQL, no un fetch a contar). */
const CLIENT_SUMMARY_WITH_COUNT = {
  ...CLIENT_SUMMARY,
  _count: { select: { workOrderEquipment: true } },
} as const;

export type EquipmentView = Equipment & {
  client: { id: string; name: string };
  /** Cuántas órdenes de trabajo incluyen este equipo — reemplaza el fetch
   * completo de /work-orders que hacía /equipos para contar en JS. */
  orderCount: number;
};

/** Una fila de GET /equipments/maintenance-due — la alerta es POR EQUIPO. */
export interface MaintenanceDueItem {
  id: string;
  brand: string;
  model: string;
  location: string | null;
  client: { id: string; name: string };
  nextMaintenanceAt: Date;
  /** Negativo = vencido hace N días. */
  daysRemaining: number;
  maintenanceIntervalMonths: number;
}

/**
 * REGLA DE ORO MULTI-TENANT: `companyId` es el primer parámetro
 * obligatorio de todos los métodos y se aplica en cada consulta.
 * Además, toda relación (clientId) se verifica contra el tenant:
 * no se puede colgar un equipo de un cliente de OTRA empresa.
 */
@Injectable()
export class EquipmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateEquipmentDto): Promise<Equipment> {
    // Validación cruzada: el cliente debe pertenecer a MI empresa
    await this.ensureClientBelongsToCompany(companyId, dto.clientId);

    return this.prisma.equipment.create({
      data: {
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        serialNumber: dto.serialNumber?.trim(),
        location: dto.location?.trim(),
        status: dto.status, // undefined → Prisma aplica el default ACTIVE
        clientId: dto.clientId,
        companyId, // candado: el equipo nace amarrado al tenant del token
        // qrCode: lo genera la BD automáticamente (@default(uuid()))
      },
      include: CLIENT_SUMMARY,
    });
  }

  async findAll(
    companyId: string,
    clientId?: string,
  ): Promise<EquipmentView[]> {
    const equipments = await this.prisma.equipment.findMany({
      where: {
        companyId, // candado
        ...(clientId ? { clientId } : {}),
      },
      include: CLIENT_SUMMARY_WITH_COUNT,
      orderBy: { createdAt: 'desc' },
    });

    return equipments.map(({ _count, ...equipment }) => ({
      ...equipment,
      orderCount: _count.workOrderEquipment,
    }));
  }

  async findOne(companyId: string, id: string): Promise<Equipment> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { id, companyId }, // candado
      include: CLIENT_SUMMARY,
    });

    if (!equipment) {
      throw new NotFoundException(`Equipo ${id} no encontrado`);
    }

    return equipment;
  }

  /**
   * Búsqueda por código QR — base del escáner del Módulo 3.
   * El técnico escanea la etiqueta física y llega directo al equipo.
   * El candado companyId aplica igual: un QR de otra empresa da 404.
   */
  async findByQrCode(companyId: string, qrCode: string): Promise<Equipment> {
    const equipment = await this.prisma.equipment.findFirst({
      where: { qrCode, companyId }, // candado
      include: CLIENT_SUMMARY,
    });

    if (!equipment) {
      throw new NotFoundException(
        'No existe ningún equipo con ese código QR en tu empresa',
      );
    }

    return equipment;
  }

  async update(
    companyId: string,
    role: Role,
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    // Verifica pertenencia del equipo al tenant (404 si es ajeno)
    const current = await this.findOne(companyId, id);

    // Si reasignan el equipo a otro cliente, ese cliente también debe ser del tenant
    if (dto.clientId) {
      await this.ensureClientBelongsToCompany(companyId, dto.clientId);
    }

    const maintenancePatch = this.resolveMaintenancePatch(role, current, dto);

    return this.prisma.equipment.update({
      where: { id },
      data: {
        brand: dto.brand?.trim(),
        model: dto.model?.trim(),
        serialNumber: dto.serialNumber?.trim(),
        location: dto.location?.trim(),
        status: dto.status,
        clientId: dto.clientId,
        ...maintenancePatch,
      },
      include: CLIENT_SUMMARY,
    });
  }

  /**
   * Resuelve el patch de mantenimiento del PATCH general de equipo (ver
   * update()). RBAC: solo ADMIN/COORDINATOR pueden tocar estos tres campos
   * — el técnico puede leer nextMaintenanceAt (ninguna restricción en los
   * GET) pero no configurar el plan, ni por la UI ni llamando al endpoint
   * directo. `undefined` = "no incluir esta clave en el `data` de Prisma",
   * distinto de `null` = "limpiar la columna".
   */
  private resolveMaintenancePatch(
    role: Role,
    current: Equipment,
    dto: UpdateEquipmentDto,
  ): Partial<
    Pick<
      Prisma.EquipmentUpdateInput,
      | 'maintenanceEnabled'
      | 'maintenanceIntervalMonths'
      | 'lastMaintenanceAt'
      | 'nextMaintenanceAt'
    >
  > {
    const touched =
      dto.maintenanceEnabled !== undefined ||
      dto.maintenanceIntervalMonths !== undefined ||
      dto.lastMaintenanceAt !== undefined;

    if (!touched) return {};

    if (role !== Role.ADMIN && role !== Role.COORDINATOR) {
      throw new ForbiddenException(
        'Solo ADMIN o COORDINATOR pueden configurar el plan de mantenimiento',
      );
    }

    const resultingEnabled = dto.maintenanceEnabled ?? current.maintenanceEnabled;
    const resultingInterval =
      dto.maintenanceIntervalMonths ?? current.maintenanceIntervalMonths ?? null;

    let resultingLastMaintenanceAt: Date | null;
    if (dto.lastMaintenanceAt !== undefined) {
      resultingLastMaintenanceAt = parseDateOnly(dto.lastMaintenanceAt);
      if (resultingLastMaintenanceAt.getTime() > todayDateOnly().getTime()) {
        throw new BadRequestException(
          'lastMaintenanceAt no puede ser una fecha futura',
        );
      }
    } else {
      resultingLastMaintenanceAt = current.lastMaintenanceAt;
    }

    if (resultingEnabled) {
      // Un plan activo sin periodicidad ni fecha base no puede calcular
      // nada y quedaría mudo para siempre — ambos son obligatorios en el
      // resultado final, vengan en este payload o ya existieran antes.
      if (resultingInterval === null) {
        throw new BadRequestException(
          'maintenanceIntervalMonths es obligatorio para activar el plan de mantenimiento',
        );
      }
      if (resultingLastMaintenanceAt === null) {
        throw new BadRequestException(
          'lastMaintenanceAt es obligatorio para activar el plan de mantenimiento',
        );
      }

      return {
        maintenanceEnabled: true,
        maintenanceIntervalMonths: resultingInterval,
        lastMaintenanceAt: resultingLastMaintenanceAt,
        nextMaintenanceAt: addMonthsUTC(resultingLastMaintenanceAt, resultingInterval),
      };
    }

    // Al desactivar: se limpia nextMaintenanceAt (ya no hay nada que
    // vigilar) pero se CONSERVAN lastMaintenanceAt y el intervalo — si
    // mañana se reactiva, no hay que volver a escribirlos. Igual se
    // persiste cualquier cambio a esos dos campos que haya traído el dto.
    return {
      maintenanceEnabled: false,
      maintenanceIntervalMonths: resultingInterval,
      lastMaintenanceAt: resultingLastMaintenanceAt,
      nextMaintenanceAt: null,
    };
  }

  /**
   * POST /equipments/maintenance/activate-batch — activa el plan para
   * VARIOS equipos de UN cliente con el mismo intervalo y fecha base en una
   * sola operación transaccional (o se aplican todos, o ninguno). Es lo que
   * hace manejable activar un cliente con ocho equipos de una sentada.
   */
  async activateMaintenanceBatch(
    companyId: string,
    dto: ActivateMaintenanceBatchDto,
  ): Promise<{ updated: number }> {
    await this.ensureClientBelongsToCompany(companyId, dto.clientId);

    const lastMaintenanceAt = parseDateOnly(dto.lastMaintenanceAt);
    if (lastMaintenanceAt.getTime() > todayDateOnly().getTime()) {
      throw new BadRequestException('lastMaintenanceAt no puede ser una fecha futura');
    }
    const nextMaintenanceAt = addMonthsUTC(
      lastMaintenanceAt,
      dto.maintenanceIntervalMonths,
    );

    return this.prisma.$transaction(async (tx) => {
      // Candado companyId + cliente: cada equipo debe ser de MI empresa Y
      // del cliente indicado (misma validación cruzada que WorkOrdersService
      // aplica a equipmentIds).
      const equipments = await tx.equipment.findMany({
        where: { id: { in: dto.equipmentIds }, companyId, clientId: dto.clientId },
        select: { id: true },
      });

      const foundIds = new Set(equipments.map((e) => e.id));
      const missingIds = dto.equipmentIds.filter((id) => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Equipo(s) no encontrado(s) en este cliente: ${missingIds.join(', ')}`,
        );
      }

      const { count } = await tx.equipment.updateMany({
        where: { id: { in: dto.equipmentIds }, companyId, clientId: dto.clientId },
        data: {
          maintenanceEnabled: true,
          maintenanceIntervalMonths: dto.maintenanceIntervalMonths,
          lastMaintenanceAt,
          nextMaintenanceAt,
        },
      });

      return { updated: count };
    });
  }

  /**
   * GET /equipments/maintenance-due — equipos con plan activo. Por defecto
   * (windowDays = MAINTENANCE_DUE_WINDOW_DAYS) solo los que vencen dentro
   * de esa ventana o ya pasaron — la ALERTA es por EQUIPO (cada uno con su
   * propio ciclo); es la pantalla de "Programar mantenimiento" la que los
   * agrupa por cliente para proponer una sola orden (regla de negocio del
   * frontend/una orden por cobro). windowDays=null quita el tope superior
   * (vista "Todos los planes" de /mantenimiento): misma consulta, sin
   * duplicarla, para que ambas vistas no puedan desincronizarse.
   */
  async findMaintenanceDue(
    companyId: string,
    windowDays: number | null = MAINTENANCE_DUE_WINDOW_DAYS,
  ): Promise<MaintenanceDueItem[]> {
    const today = todayDateOnly();
    const cutoff = windowDays !== null ? addDaysUTC(today, windowDays) : null;

    const equipments = await this.prisma.equipment.findMany({
      where: {
        companyId,
        maintenanceEnabled: true,
        ...(cutoff !== null ? { nextMaintenanceAt: { lte: cutoff } } : {}),
      },
      select: {
        id: true,
        brand: true,
        model: true,
        location: true,
        nextMaintenanceAt: true,
        maintenanceIntervalMonths: true,
        client: { select: { id: true, name: true } },
      },
      // Del más vencido al menos urgente: nextMaintenanceAt ascendente.
      orderBy: { nextMaintenanceAt: 'asc' },
    });

    return equipments.map((equipment) => ({
      id: equipment.id,
      brand: equipment.brand,
      model: equipment.model,
      location: equipment.location,
      client: equipment.client,
      nextMaintenanceAt: equipment.nextMaintenanceAt!,
      // Negativo = vencido hace N días. equipment.nextMaintenanceAt nunca
      // es null acá: el where exige maintenanceEnabled=true, que siempre
      // viaja junto con nextMaintenanceAt calculado (ver resolveMaintenancePatch).
      daysRemaining: diffDaysUTC(today, equipment.nextMaintenanceAt!),
      maintenanceIntervalMonths: equipment.maintenanceIntervalMonths!,
    }));
  }

  /** GET /equipments/maintenance-due/count — mismo criterio, para el dashboard. */
  countMaintenanceDue(companyId: string): Promise<number> {
    const cutoff = addDaysUTC(todayDateOnly(), MAINTENANCE_DUE_WINDOW_DAYS);
    return this.prisma.equipment.count({
      where: {
        companyId,
        maintenanceEnabled: true,
        nextMaintenanceAt: { lte: cutoff },
      },
    });
  }

  async remove(companyId: string, id: string): Promise<Equipment> {
    // Verifica pertenencia al tenant ANTES de eliminar
    await this.findOne(companyId, id);

    try {
      return await this.prisma.equipment.delete({ where: { id } });
    } catch (error) {
      // P2003: violación de FK — el equipo tiene órdenes de trabajo
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el equipo tiene órdenes de trabajo asociadas. ' +
            'Cierra o elimina sus órdenes primero.',
        );
      }
      throw error;
    }
  }

  /** Validación cruzada multi-tenant de la relación Equipment → Client. */
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
}
