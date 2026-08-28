import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityAction,
  OrderStatus,
  PaymentStatus,
  Prisma,
  Priority,
  Role,
  ServiceType,
  WorkOrder,
} from 'database';
import {
  ACTIVITY_ORDER_STATUS_LABELS,
  ACTIVITY_PRIORITY_LABELS,
  activityAuthorName,
  formatActivityCollectionNumber,
  formatActivityCurrency,
  formatActivityDate,
} from '../activity/activity-labels';
import { ActivityService } from '../activity/activity.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  addMonthsUTC,
  formatDateOnly,
  todayDateOnly,
} from '../common/date-only.util';
import { EquipmentsService } from '../equipments/equipments.service';
import { PrismaService } from '../prisma.service';
import { QuotesService } from '../quotes/quotes.service';
import { calculateBilling, derivePaymentStatus } from './billing.util';
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

/**
 * Vista pública de una orden: WorkOrder + client/user incluidos + equipments
 * ya aplanado. directCostAmount/directCostDescription (costos internos, ver
 * módulo de Rentabilidad) quedan OPCIONALES a propósito: toView() los omite
 * para todo rol distinto de ADMIN — mismo criterio RBAC financiero que
 * WorkOrderPart.unitCost.
 */
export type WorkOrderView = Omit<
  WorkOrder,
  'directCostAmount' | 'directCostDescription'
> & {
  directCostAmount?: WorkOrder['directCostAmount'];
  directCostDescription?: WorkOrder['directCostDescription'];
  client: { id: string; name: string };
  user: { id: string; name: string; email: string } | null;
  equipments: WorkOrderEquipmentSummary[];
};

/** Estados terminales: una orden entregada o cancelada queda sellada. */
const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

/** Órdenes "cerradas" (valorizadas, totalAmount congelado) — mismo criterio que PaymentsService. */
const CLOSED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
];

const ALL_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.IN_PROGRESS,
  OrderStatus.COMPLETED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

const RANKING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface WorkOrderFindAllFilters {
  status?: OrderStatus;
  priority?: Priority;
  paymentStatus?: PaymentStatus;
  clientId?: string;
  equipmentId?: string;
  /** Filtro de query — para TECHNICIAN queda siempre pisado por su propio id. */
  userId?: string;
  /**
   * Buscador de una sola casilla: nombre/documento del cliente, descripción
   * del servicio y, si el término trae dígitos, número de OT o de cuenta de
   * cobro. Ver buildWhere() para el detalle — términos de menos de 2
   * caracteres se ignoran.
   */
  search?: string;
  take?: number;
  skip?: number;
}

export interface WorkOrderStatusCount {
  status: OrderStatus;
  count: number;
}

export interface WorkOrderTechnicianRankingEntry {
  userId: string;
  name: string;
  closedCount: number;
}

export interface WorkOrderDashboardStats {
  statusCounts: WorkOrderStatusCount[];
  activeCount: number;
  unassignedActiveCount: number;
  /** null si no hay ninguna orden cerrada (DELIVERED/CANCELLED) todavía. */
  avgResolutionDays: number | null;
  technicianRanking: WorkOrderTechnicianRankingEntry[];
  recentOrders: WorkOrderView[];
  /** Equipos con plan de mantenimiento activo por vencer o ya vencidos (ver EquipmentsService.countMaintenanceDue). */
  maintenanceDueCount: number;
  /** Cotizaciones SENT sin decisión cuyo followUpAt ya pasó o es hoy (ver QuotesService.countFollowUpDue). */
  quotesFollowUpCount: number;
}

/**
 * REGLA DE ORO MULTI-TENANT + RBAC FINO:
 * - Todos los métodos reciben el AuthenticatedUser completo (companyId,
 *   userId, role) y aplican el candado companyId en cada consulta.
 * - TECHNICIAN: su filtro de visibilidad (userId = él mismo) se inyecta
 *   DENTRO del `where` de Prisma — una orden ajena es un 404, ni siquiera
 *   puede saber que existe. Y solo puede editar status, description,
 *   diagnosis y observations.
 */
@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
    private readonly activityService: ActivityService,
    private readonly equipmentsService: EquipmentsService,
    private readonly quotesService: QuotesService,
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

      const workOrder = await tx.workOrder.create({
        data: {
          orderNumber: company.nextOrderNumber - 1,
          description: dto.description.trim(),
          diagnosis: dto.diagnosis?.trim(),
          observations: dto.observations?.trim(),
          priority: dto.priority, // undefined → default MEDIUM
          serviceType: dto.serviceType, // undefined → default CORRECTIVE
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

      const actorName = activityAuthorName(user);

      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId: workOrder.id,
          userId: user.userId,
          userName: actorName,
          action: ActivityAction.ORDER_CREATED,
          isFinancial: false,
        },
        tx,
      );

      if (workOrder.user) {
        await this.activityService.record(
          {
            companyId: user.companyId,
            workOrderId: workOrder.id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.TECHNICIAN_ASSIGNED,
            field: 'Técnico asignado',
            oldValue: null,
            newValue: workOrder.user.name,
            isFinancial: false,
          },
          tx,
        );
      }

      return workOrder;
    });

    return this.toView(created, user.role);
  }

  async findAll(
    user: AuthenticatedUser,
    filters: WorkOrderFindAllFilters = {},
  ): Promise<WorkOrderView[]> {
    const orders = await this.prisma.workOrder.findMany({
      where: this.buildWhere(user, filters),
      include: WORK_ORDER_INCLUDE,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: filters.take,
      skip: filters.skip,
    });

    return orders.map((order) => this.toView(order, user.role));
  }

  /** GET /work-orders/count — mismo `where` que findAll, sin traer filas. */
  count(
    user: AuthenticatedUser,
    filters: Omit<WorkOrderFindAllFilters, 'take' | 'skip'> = {},
  ): Promise<number> {
    return this.prisma.workOrder.count({
      where: this.buildWhere(user, filters),
    });
  }

  /**
   * GET /work-orders/stats — agregados del dashboard (ver controller: solo
   * Admin/Coordinador). Reemplaza el cálculo que antes corría en el
   * frontend sobre un fetch completo de TODA la empresa: acá cada número
   * sale de una query acotada/indexada (groupBy o count), salvo el
   * promedio de resolución, que necesita createdAt/updatedAt fila por fila
   * pero solo de las órdenes YA cerradas y con un select liviano de 2
   * columnas (no el include completo con joins de cliente/equipos/técnico).
   */
  async getStats(user: AuthenticatedUser): Promise<WorkOrderDashboardStats> {
    const companyId = user.companyId; // candado
    const since = new Date(Date.now() - RANKING_WINDOW_MS);

    const [
      statusGroups,
      activeCount,
      unassignedActiveCount,
      closedForAvg,
      rankingGroups,
      technicians,
      recentOrders,
      maintenanceDueCount,
      quotesFollowUpCount,
    ] = await Promise.all([
      this.prisma.workOrder.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { _all: true },
      }),
      this.prisma.workOrder.count({
        where: { companyId, status: { notIn: TERMINAL_STATUSES } },
      }),
      this.prisma.workOrder.count({
        where: {
          companyId,
          status: { notIn: TERMINAL_STATUSES },
          userId: null,
        },
      }),
      this.prisma.workOrder.findMany({
        where: { companyId, status: { in: TERMINAL_STATUSES } },
        select: { createdAt: true, updatedAt: true },
      }),
      this.prisma.workOrder.groupBy({
        by: ['userId'],
        where: {
          companyId,
          status: { in: TERMINAL_STATUSES },
          updatedAt: { gte: since },
          userId: { not: null },
        },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        where: { companyId, role: Role.TECHNICIAN },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.workOrder.findMany({
        where: { companyId },
        include: WORK_ORDER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.equipmentsService.countMaintenanceDue(companyId),
      this.quotesService.countFollowUpDue(companyId),
    ]);

    const countByStatus = new Map(
      statusGroups.map((g) => [g.status, g._count._all]),
    );
    const statusCounts: WorkOrderStatusCount[] = ALL_STATUSES.map((status) => ({
      status,
      count: countByStatus.get(status) ?? 0,
    }));

    const DAY_MS = 24 * 60 * 60 * 1000;
    const avgResolutionDays =
      closedForAvg.length === 0
        ? null
        : closedForAvg.reduce(
            (sum, o) =>
              sum + (o.updatedAt.getTime() - o.createdAt.getTime()) / DAY_MS,
            0,
          ) / closedForAvg.length;

    const rankingCounts = new Map(
      rankingGroups.map((g) => [g.userId as string, g._count._all]),
    );
    const technicianRanking: WorkOrderTechnicianRankingEntry[] = technicians
      .map((tech) => ({
        userId: tech.id,
        name: tech.name,
        closedCount: rankingCounts.get(tech.id) ?? 0,
      }))
      .sort((a, b) => b.closedCount - a.closedCount);

    return {
      statusCounts,
      activeCount,
      unassignedActiveCount,
      avgResolutionDays,
      technicianRanking,
      recentOrders: recentOrders.map((order) => this.toView(order, user.role)),
      maintenanceDueCount,
      quotesFollowUpCount,
    };
  }

  /**
   * `where` compartido entre findAll/count: candado de tenant + filtros
   * opcionales + RBAC de TECHNICIAN aplicado AL FINAL, para que un
   * `userId` de query jamás pueda pisar la restricción a sus propias
   * órdenes (ver nota de RBAC en el controller).
   */
  private buildWhere(
    user: AuthenticatedUser,
    filters: Omit<WorkOrderFindAllFilters, 'take' | 'skip'>,
  ): Prisma.WorkOrderWhereInput {
    const searchCondition = this.buildSearchCondition(filters.search);

    const where: Prisma.WorkOrderWhereInput = {
      companyId: user.companyId, // candado
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.paymentStatus
        ? { paymentStatus: filters.paymentStatus }
        : {}),
      ...(filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.equipmentId
        ? { equipmentLinks: { some: { equipmentId: filters.equipmentId } } }
        : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
      // El OR del buscador queda ANIDADO como una condición propia (AND),
      // nunca mezclado al mismo nivel que los demás filtros: el resultado
      // debe leerse "(empresa) Y (estado) Y (coincide con el término)". Si
      // quedara suelto en el mismo nivel del where, anularía el candado
      // companyId y el RBAC del técnico (ver más abajo).
      ...(searchCondition ? { AND: searchCondition } : {}),
    };

    if (user.role === Role.TECHNICIAN) {
      // RBAC fino: el técnico SOLO ve sus órdenes asignadas — gana sobre
      // cualquier userId que haya llegado por query, y también sobre
      // cualquier resultado que el buscador hubiera encontrado en órdenes
      // ajenas.
      where.userId = user.userId;
    }

    return where;
  }

  /**
   * Buscador de una sola casilla (ver WorkOrderFindAllFilters.search):
   * arma el OR entre cliente (nombre/documento), descripción y — si el
   * término trae al menos un dígito — número de OT y de cuenta de cobro.
   * Términos de menos de 2 caracteres se ignoran (no filtran nada).
   * Devuelve null cuando no hay nada que buscar.
   *
   * LIMITACIÓN CONOCIDA: el documento del cliente se guarda tal como se
   * digitó (sin normalizar puntos/guiones), así que "900.826.705-4" no
   * aparece si se busca "900826705". No se resuelve acá — requeriría una
   * columna normalizada + backfill.
   */
  private buildSearchCondition(
    search: string | undefined,
  ): Prisma.WorkOrderWhereInput | null {
    const term = search?.trim();
    if (!term || term.length < 2) {
      return null;
    }

    const conditions: Prisma.WorkOrderWhereInput[] = [
      { client: { name: { contains: term, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: term, mode: 'insensitive' } } },
      { description: { contains: term, mode: 'insensitive' } },
    ];

    // "OT-0015", "N.º 0125", "0015", "15": se queda solo con los dígitos y
    // les quita los ceros a la izquierda antes de convertir, para que
    // "0015" encuentre la OT-0015 (orderNumber = 15 en BD, sin padding).
    const digits = term.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digits.length > 0) {
      const numericTerm = Number(digits);
      // Protege la conversión: si el término numérico no cabe en un entero
      // seguro (ej. un NIT muy largo), se omiten estas dos condiciones en
      // vez de romper la consulta.
      if (Number.isSafeInteger(numericTerm)) {
        conditions.push({ orderNumber: numericTerm });
        conditions.push({ collectionNumber: numericTerm });
      }
    }

    return { OR: conditions };
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

    return this.toView(workOrder, user.role);
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateWorkOrderDto,
  ): Promise<WorkOrderView> {
    // Pertenencia al tenant + visibilidad del técnico (404 si no aplica)
    const workOrder = await this.findOne(user, id);

    // Excepción puntual: ADMIN puede corregir SOLO la fecha de facturación
    // de una orden YA facturada, incluso si quedó sellada (DELIVERED) — el
    // congelamiento contable (billing.util) protege el TOTAL, no la fecha,
    // que puede necesitar corrección si la orden se completó en el sistema
    // días después del servicio real. No se combina con otros campos: así
    // no hay que reconciliar esta excepción con el resto del método.
    const isBilledAtOnlyEdit =
      dto.billedAt !== undefined &&
      Object.entries(dto).every(
        ([key, value]) => key === 'billedAt' || value === undefined,
      );

    if (isBilledAtOnlyEdit) {
      if (user.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Solo un ADMIN puede modificar la fecha de facturación',
        );
      }
      if (workOrder.billedAt === null) {
        throw new ConflictException(
          'La orden aún no ha sido facturada: no tiene fecha de facturación que corregir',
        );
      }

      const newBilledAt = new Date(dto.billedAt!);
      // Corte al final del día (no el instante exacto): billedAt viaja como
      // fecha (YYYY-MM-DD) desde el selector del frontend, no como
      // timestamp, así que comparar contra Date.now() a secas rechazaría
      // "hoy" en zonas horarias adelantadas a UTC.
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (newBilledAt.getTime() > endOfToday.getTime()) {
        throw new ConflictException(
          'La fecha de facturación no puede ser futura',
        );
      }

      const previousBilledAt = workOrder.billedAt;

      // El update y su log de bitácora viajan en la misma transacción.
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.workOrder.update({
          where: { id },
          data: { billedAt: newBilledAt },
          include: WORK_ORDER_INCLUDE,
        });

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: activityAuthorName(user),
            action: ActivityAction.BILLED_AT_CHANGED,
            field: 'Fecha de facturación',
            oldValue: formatActivityDate(previousBilledAt),
            newValue: formatActivityDate(newBilledAt),
            isFinancial: true,
          },
          tx,
        );

        return result;
      });

      return this.toView(updated, user.role);
    }

    // billedAt combinado con otros campos: el resto del método no lo
    // persiste (no vive en el `data` del update general) — se rechaza
    // explícito para no fallar en silencio.
    if (dto.billedAt !== undefined) {
      throw new ConflictException(
        'billedAt debe enviarse solo, sin combinar con otros campos',
      );
    }

    // Costos internos (módulo de Rentabilidad): mismo patrón de excepción
    // que billedAt arriba — ADMIN puede corregirlos incluso con la orden
    // ya sellada (DELIVERED/CANCELLED), porque la factura del proveedor
    // (torno, materiales de la obra) suele llegar días después de
    // entregado el trabajo. Se envían solos, sin combinar con otros
    // campos, para no tener que reconciliar esta excepción con el resto
    // del método (RBAC, congelamiento, etc.).
    const isDirectCostOnlyEdit =
      (dto.directCostAmount !== undefined ||
        dto.directCostDescription !== undefined) &&
      Object.entries(dto).every(
        ([key, value]) =>
          key === 'directCostAmount' ||
          key === 'directCostDescription' ||
          value === undefined,
      );

    if (isDirectCostOnlyEdit) {
      if (user.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Solo un ADMIN puede modificar los costos internos de la orden',
        );
      }

      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { currency: true },
      });

      // Un solo evento de bitácora para el bloque completo (monto +
      // descripción): el texto combinado captura cualquiera de los dos
      // cambios, y "Otros costos directos" es el único campo pedido.
      const formatDirectCost = (
        amount: Prisma.Decimal,
        description: string | null,
      ): string =>
        description
          ? `${formatActivityCurrency(amount, company.currency)} — ${description}`
          : formatActivityCurrency(amount, company.currency);

      const previousAmount =
        workOrder.directCostAmount ?? new Prisma.Decimal(0);
      const previousDescription = workOrder.directCostDescription ?? null;

      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.workOrder.update({
          where: { id },
          data: {
            directCostAmount: dto.directCostAmount,
            directCostDescription: dto.directCostDescription?.trim(),
          },
          include: WORK_ORDER_INCLUDE,
        });

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: activityAuthorName(user),
            action: ActivityAction.BILLING_UPDATED,
            field: 'Otros costos directos',
            oldValue: formatDirectCost(previousAmount, previousDescription),
            newValue: formatDirectCost(
              result.directCostAmount,
              result.directCostDescription,
            ),
            isFinancial: true,
          },
          tx,
        );

        return result;
      });

      return this.toView(updated, user.role);
    }

    if (
      dto.directCostAmount !== undefined ||
      dto.directCostDescription !== undefined
    ) {
      throw new ConflictException(
        'directCostAmount/directCostDescription deben enviarse solos, sin combinar con otros campos',
      );
    }

    // Valorización de una orden YA CERRADA (totalAmount congelado): un ADMIN
    // puede corregir mano de obra/cargos adicionales/descuento incluso
    // después del cierre (ej. condonar la visita de diagnóstico de una
    // orden ya entregada) — de otro modo queda bloqueado por el candado de
    // estado terminal más abajo. Mismo patrón "solo, sin combinar" que
    // billedAt/directCost arriba: así esta excepción no se reconcilia con
    // el resto del método (RBAC de técnico/coordinador, congelamiento al
    // completar, etc.). Si la orden TODAVÍA no está cerrada (totalAmount
    // null), estos mismos campos siguen su camino normal más abajo.
    const isBillingOnlyEdit =
      (dto.laborAmount !== undefined ||
        dto.additionalAmount !== undefined ||
        dto.additionalDescription !== undefined ||
        dto.discountAmount !== undefined) &&
      Object.entries(dto).every(
        ([key, value]) =>
          key === 'laborAmount' ||
          key === 'additionalAmount' ||
          key === 'additionalDescription' ||
          key === 'discountAmount' ||
          value === undefined,
      );

    if (isBillingOnlyEdit && workOrder.totalAmount !== null) {
      if (user.role !== Role.ADMIN) {
        throw new ForbiddenException(
          'Solo un ADMIN puede modificar la valorización de una orden cerrada',
        );
      }

      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { currency: true },
      });

      const parts = await this.prisma.workOrderPart.findMany({
        where: { workOrderId: id, companyId: user.companyId },
        select: { unitPrice: true, quantity: true },
      });
      const partsTotal = parts.reduce(
        (acc, p) => acc.add(p.unitPrice.mul(p.quantity)),
        new Prisma.Decimal(0),
      );

      const newLaborAmount =
        dto.laborAmount !== undefined
          ? new Prisma.Decimal(dto.laborAmount)
          : workOrder.laborAmount;
      const newAdditionalAmount =
        dto.additionalAmount !== undefined
          ? new Prisma.Decimal(dto.additionalAmount)
          : workOrder.additionalAmount;
      const newDiscountAmount =
        dto.discountAmount !== undefined
          ? new Prisma.Decimal(dto.discountAmount)
          : workOrder.discountAmount;

      // IVA CONGELADO de esta orden (taxRateApplied), NUNCA el vigente de
      // la empresa: editar un cierre económico viejo no puede heredar el
      // IVA de hoy solo porque la tarifa de la empresa cambió después.
      const { total: newTotal } = calculateBilling({
        laborAmount: newLaborAmount,
        partsTotal,
        additionalAmount: newAdditionalAmount,
        discountAmount: newDiscountAmount,
        taxRate: workOrder.taxRateApplied!,
      });

      const paidAgg = await this.prisma.payment.aggregate({
        where: { workOrderId: id, companyId: user.companyId }, // candado
        _sum: { amount: true },
      });
      const paidAmount = paidAgg._sum.amount ?? new Prisma.Decimal(0);

      // Un saldo negativo no significa nada y descuadra la cartera: si el
      // nuevo total queda por debajo de lo ya abonado, hay que corregir los
      // pagos primero (eliminarlos o ajustarlos), no forzar el total.
      if (newTotal.lessThan(paidAmount)) {
        throw new ConflictException(
          `El nuevo total (${formatActivityCurrency(newTotal, company.currency)}) no puede quedar por debajo de lo ya abonado (${formatActivityCurrency(paidAmount, company.currency)}). Corrige primero los pagos registrados.`,
        );
      }

      const newPaymentStatus = derivePaymentStatus(newTotal, paidAmount);
      const actorName = activityAuthorName(user);

      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.workOrder.update({
          where: { id },
          data: {
            laborAmount: dto.laborAmount,
            additionalAmount: dto.additionalAmount,
            additionalDescription: dto.additionalDescription?.trim(),
            discountAmount: dto.discountAmount,
            totalAmount: newTotal,
            paymentStatus: newPaymentStatus,
          },
          include: WORK_ORDER_INCLUDE,
        });

        // Un evento POR CAMPO, igual que la valorización de una orden
        // abierta más abajo — recordFieldChange no escribe si no cambió.
        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Mano de obra (orden cerrada)',
            oldValue: formatActivityCurrency(
              workOrder.laborAmount,
              company.currency,
            ),
            newValue: formatActivityCurrency(
              result.laborAmount,
              company.currency,
            ),
            isFinancial: true,
          },
          tx,
        );

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Cargos adicionales (orden cerrada)',
            oldValue: formatActivityCurrency(
              workOrder.additionalAmount,
              company.currency,
            ),
            newValue: formatActivityCurrency(
              result.additionalAmount,
              company.currency,
            ),
            isFinancial: true,
          },
          tx,
        );

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Descripción de cargos adicionales (orden cerrada)',
            oldValue: workOrder.additionalDescription,
            newValue: result.additionalDescription,
            isFinancial: true,
          },
          tx,
        );

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Descuento (orden cerrada)',
            oldValue: formatActivityCurrency(
              workOrder.discountAmount,
              company.currency,
            ),
            newValue: formatActivityCurrency(
              result.discountAmount,
              company.currency,
            ),
            isFinancial: true,
          },
          tx,
        );

        // Total: consecuencia de los campos de arriba, no un campo que el
        // usuario haya tocado directamente — pero es el número que de
        // verdad le importa a Cobros, así que queda su propio evento.
        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Total a cobrar (orden cerrada)',
            oldValue: formatActivityCurrency(
              workOrder.totalAmount!,
              company.currency,
            ),
            newValue: formatActivityCurrency(
              result.totalAmount!,
              company.currency,
            ),
            isFinancial: true,
          },
          tx,
        );

        return result;
      });

      return this.toView(updated, user.role);
    }

    // La descripción identifica de qué se trata la orden en listados,
    // buscador y documentos: a diferencia de diagnosis/observations, no
    // puede quedar vacía. @IsNotEmpty del DTO ya rechaza "", pero no un
    // valor de solo espacios — que el trim() de más abajo dejaría vacío
    // igual, así que se valida acá, sobre el mismo valor ya recortado.
    if (dto.description !== undefined && dto.description.trim() === '') {
      throw new BadRequestException('La descripción no puede quedar vacía');
    }

    // Una orden entregada o cancelada queda sellada para todos
    if (TERMINAL_STATUSES.includes(workOrder.status)) {
      throw new ConflictException(
        `La orden está en estado terminal (${workOrder.status}) y no admite cambios`,
      );
    }

    // RBAC fino: el técnico solo puede tocar status, description, diagnosis
    // y observations — description tiene el mismo permiso que diagnosis y
    // observations porque el alcance real de la orden muchas veces solo se
    // conoce al llegar al sitio.
    if (user.role === Role.TECHNICIAN) {
      const forbiddenFields: string[] = [];
      if (dto.priority !== undefined) forbiddenFields.push('priority');
      if (dto.serviceType !== undefined) forbiddenFields.push('serviceType');
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
      // billedAt no aparece acá: si llegó hasta este punto ya no está
      // presente en el dto (el bloque de arriba lo maneja o lo rechaza).

      if (forbiddenFields.length > 0) {
        throw new ForbiddenException(
          `Como técnico solo puedes modificar status, description, diagnosis y observations. ` +
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
      // billedAt: mismo caso que arriba, ya no puede estar presente acá.

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

    // Campos de valorización: si cambia alguno, cada uno genera su propio
    // evento BILLING_UPDATED (ver más abajo) — para eso necesitamos la
    // moneda del tenant, sin importar si la orden se está completando o no.
    const billingFieldsTouched =
      dto.laborAmount !== undefined ||
      dto.additionalAmount !== undefined ||
      dto.additionalDescription !== undefined ||
      dto.discountAmount !== undefined;

    let currency: string | undefined;

    if (dto.status === OrderStatus.COMPLETED) {
      const [company, parts] = await Promise.all([
        this.prisma.company.findUniqueOrThrow({
          where: { id: user.companyId },
          select: { taxRate: true, currency: true },
        }),
        this.prisma.workOrderPart.findMany({
          where: { workOrderId: id, companyId: user.companyId },
          select: { unitPrice: true, quantity: true },
        }),
      ]);
      currency = company.currency;

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
    } else if (billingFieldsTouched) {
      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { currency: true },
      });
      currency = company.currency;
    }

    // Mantenimiento preventivo: solo en la TRANSICIÓN a COMPLETED (no en un
    // reenvío del mismo estado, ej. al corregir un monto) de una orden cuyo
    // serviceType resultante es PREVENTIVE. `resultingServiceType` mira el
    // dto primero porque esta misma llamada puede traer el cambio de tipo
    // de servicio junto con el cierre.
    const resultingServiceType = dto.serviceType ?? workOrder.serviceType;
    const isCompletingNow =
      dto.status === OrderStatus.COMPLETED &&
      workOrder.status !== OrderStatus.COMPLETED;
    const shouldUpdateMaintenance =
      isCompletingNow && resultingServiceType === ServiceType.PREVENTIVE;

    // Snapshot ANTES del update: base de comparación para los eventos de la
    // bitácora (ver más abajo). workOrder ya viene de findOne(), con
    // user/equipments incluidos.
    const actorName = activityAuthorName(user);
    const oldEquipmentIds = new Set(workOrder.equipments.map((e) => e.id));
    const oldEquipmentsById = new Map(
      workOrder.equipments.map((equipment) => [equipment.id, equipment]),
    );

    // El update y los eventos de bitácora viajan en la MISMA transacción:
    // si el update falla o se revierte, ningún log de este cambio queda
    // escrito.
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.workOrder.update({
        where: { id },
        data: {
          description: dto.description?.trim(),
          diagnosis: dto.diagnosis?.trim(),
          observations: dto.observations?.trim(),
          status: dto.status,
          priority: dto.priority,
          serviceType: dto.serviceType,
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

      // recordFieldChange no escribe si el campo no cambió (ej. status no
      // vino en el dto: Prisma no lo tocó, result.status === workOrder.status).
      await this.activityService.recordFieldChange(
        {
          companyId: user.companyId,
          workOrderId: id,
          userId: user.userId,
          userName: actorName,
          action: ActivityAction.STATUS_CHANGED,
          field: 'Estado',
          oldValue: ACTIVITY_ORDER_STATUS_LABELS[workOrder.status],
          newValue: ACTIVITY_ORDER_STATUS_LABELS[result.status],
          isFinancial: false,
        },
        tx,
      );

      await this.activityService.recordFieldChange(
        {
          companyId: user.companyId,
          workOrderId: id,
          userId: user.userId,
          userName: actorName,
          action: ActivityAction.PRIORITY_CHANGED,
          field: 'Prioridad',
          oldValue: ACTIVITY_PRIORITY_LABELS[workOrder.priority],
          newValue: ACTIVITY_PRIORITY_LABELS[result.priority],
          isFinancial: false,
        },
        tx,
      );

      // Cubre asignación inicial (oldValue null), reasignación y
      // desasignación (newValue null) — con los NOMBRES, no los ids.
      await this.activityService.recordFieldChange(
        {
          companyId: user.companyId,
          workOrderId: id,
          userId: user.userId,
          userName: actorName,
          action: ActivityAction.TECHNICIAN_ASSIGNED,
          field: 'Técnico asignado',
          oldValue: workOrder.user?.name ?? null,
          newValue: result.user?.name ?? null,
          isFinancial: false,
        },
        tx,
      );

      // Valorización: un evento POR CAMPO, no uno agregado — así se ve
      // exactamente qué cifra concreta se movió. recordFieldChange no
      // escribe nada si el campo no cambió. Solo corre si currency quedó
      // definido (COMPLETED o algún campo de valorización presente en el
      // dto); si no, ningún monto pudo haber cambiado.
      if (currency) {
        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Mano de obra',
            oldValue: formatActivityCurrency(workOrder.laborAmount, currency),
            newValue: formatActivityCurrency(result.laborAmount, currency),
            isFinancial: true,
          },
          tx,
        );

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Cargos adicionales',
            oldValue: formatActivityCurrency(
              workOrder.additionalAmount,
              currency,
            ),
            newValue: formatActivityCurrency(result.additionalAmount, currency),
            isFinancial: true,
          },
          tx,
        );

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Descripción de cargos adicionales',
            oldValue: workOrder.additionalDescription,
            newValue: result.additionalDescription,
            isFinancial: true,
          },
          tx,
        );

        await this.activityService.recordFieldChange(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.BILLING_UPDATED,
            field: 'Descuento',
            oldValue: formatActivityCurrency(
              workOrder.discountAmount,
              currency,
            ),
            newValue: formatActivityCurrency(result.discountAmount, currency),
            isFinancial: true,
          },
          tx,
        );
      }

      // Diagnóstico/observaciones/descripción: NUNCA se guarda el texto en
      // la bitácora (puede ser muy largo) — solo el evento, si de verdad
      // cambió.
      if (
        dto.diagnosis !== undefined &&
        dto.diagnosis.trim() !== (workOrder.diagnosis ?? '')
      ) {
        await this.activityService.record(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.DIAGNOSIS_UPDATED,
            field: 'Diagnóstico',
            isFinancial: false,
          },
          tx,
        );
      }

      if (
        dto.observations !== undefined &&
        dto.observations.trim() !== (workOrder.observations ?? '')
      ) {
        await this.activityService.record(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.OBSERVATIONS_UPDATED,
            field: 'Observaciones',
            isFinancial: false,
          },
          tx,
        );
      }

      if (
        dto.description !== undefined &&
        dto.description.trim() !== workOrder.description
      ) {
        await this.activityService.record(
          {
            companyId: user.companyId,
            workOrderId: id,
            userId: user.userId,
            userName: actorName,
            action: ActivityAction.DESCRIPTION_UPDATED,
            field: 'Descripción',
            isFinancial: false,
          },
          tx,
        );
      }

      if (dto.equipmentIds !== undefined) {
        const newEquipmentIds = new Set(dto.equipmentIds);
        const newEquipmentsById = new Map(
          result.equipmentLinks.map((link) => [
            link.equipment.id,
            link.equipment,
          ]),
        );

        for (const equipmentId of newEquipmentIds) {
          if (oldEquipmentIds.has(equipmentId)) continue;
          const equipment = newEquipmentsById.get(equipmentId);
          if (!equipment) continue;
          await this.activityService.record(
            {
              companyId: user.companyId,
              workOrderId: id,
              userId: user.userId,
              userName: actorName,
              action: ActivityAction.EQUIPMENT_LINKED,
              newValue: this.formatEquipmentLabel(equipment),
              isFinancial: false,
            },
            tx,
          );
        }

        for (const equipmentId of oldEquipmentIds) {
          if (newEquipmentIds.has(equipmentId)) continue;
          const equipment = oldEquipmentsById.get(equipmentId);
          if (!equipment) continue;
          await this.activityService.record(
            {
              companyId: user.companyId,
              workOrderId: id,
              userId: user.userId,
              userName: actorName,
              action: ActivityAction.EQUIPMENT_UNLINKED,
              newValue: this.formatEquipmentLabel(equipment),
              isFinancial: false,
            },
            tx,
          );
        }
      }

      // Mantenimiento preventivo: DENTRO de esta misma transacción — si el
      // cierre se revierte, ninguna fecha de mantenimiento queda movida.
      // Cada equipo se recalcula con SU PROPIO intervalo (nunca uno común):
      // tres equipos con ciclos de 3, 4 y 6 meses en la misma orden deben
      // quedar con tres próximas fechas distintas.
      if (shouldUpdateMaintenance) {
        const linkedEquipmentIds = result.equipmentLinks.map(
          (link) => link.equipment.id,
        );

        if (linkedEquipmentIds.length > 0) {
          // Solo los equipos CON PLAN ACTIVO — uno sin plan dentro de la
          // misma orden preventiva no se toca (no hay intervalo con qué
          // recalcular, y no fue el usuario quien pidió vigilarlo).
          const eligibleEquipments = await tx.equipment.findMany({
            where: {
              id: { in: linkedEquipmentIds },
              companyId: user.companyId,
              maintenanceEnabled: true,
            },
            select: {
              id: true,
              brand: true,
              model: true,
              location: true,
              maintenanceIntervalMonths: true,
            },
          });

          if (eligibleEquipments.length > 0) {
            const closureDate = todayDateOnly();
            const updatedLabels: string[] = [];

            for (const equipment of eligibleEquipments) {
              // Invariante garantizada por EquipmentsService: si
              // maintenanceEnabled=true, el intervalo siempre está seteado.
              const nextMaintenanceAt = addMonthsUTC(
                closureDate,
                equipment.maintenanceIntervalMonths!,
              );

              await tx.equipment.update({
                where: { id: equipment.id },
                data: {
                  lastMaintenanceAt: closureDate,
                  nextMaintenanceAt,
                },
              });

              const label = equipment.location
                ? `${equipment.brand} ${equipment.model} — ${equipment.location}`
                : `${equipment.brand} ${equipment.model}`;
              updatedLabels.push(
                `${label}: próxima ${formatDateOnly(nextMaintenanceAt)}`,
              );
            }

            await this.activityService.record(
              {
                companyId: user.companyId,
                workOrderId: id,
                userId: user.userId,
                userName: actorName,
                action: ActivityAction.MAINTENANCE_UPDATED,
                field: 'Mantenimiento',
                newValue: updatedLabels.join('; '),
                isFinancial: false,
              },
              tx,
            );
          }
        }
      }

      return result;
    });

    return this.toView(updated, user.role);
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
   *
   * Una cuenta de cobro emitida YA NO bloquea el borrado (el frontend
   * advierte del hueco que deja en el consecutivo antes de confirmar) —
   * pero los PAGOS sí siguen bloqueando: son movimientos de dinero reales,
   * y borrarlos en cascada sin que nadie lo note descuadraría la cartera
   * de forma invisible. El mensaje ya indica el camino (borrar los pagos
   * primero, o marcar Cancelada).
   */
  async remove(user: AuthenticatedUser, id: string): Promise<WorkOrderView> {
    // El guard @Roles(ADMIN) ya filtró el rol; verificamos tenant + existencia
    const order = await this.findOne(user, id);

    const paidAgg = await this.prisma.payment.aggregate({
      where: { workOrderId: id, companyId: user.companyId }, // candado
      _sum: { amount: true },
    });
    const totalPaid = paidAgg._sum.amount ?? new Prisma.Decimal(0);
    if (totalPaid.greaterThan(0)) {
      const company = await this.prisma.company.findUniqueOrThrow({
        where: { id: user.companyId },
        select: { currency: true },
      });
      throw new ConflictException(
        `No se puede eliminar: esta orden tiene pagos registrados por ${formatActivityCurrency(totalPaid, company.currency)}. Elimina primero los pagos si fueron un error, o márcala como Cancelada.`,
      );
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { workOrderId: id, companyId: user.companyId }, // candado
      select: { publicId: true },
    });

    await this.prisma.$transaction(async (tx) => {
      const parts = await tx.workOrderPart.findMany({
        where: { workOrderId: id, companyId: user.companyId }, // candado
        select: {
          sparePartId: true,
          quantity: true,
          sparePart: { select: { trackStock: true } },
        },
      });

      for (const part of parts) {
        // "Contra pedido" (trackStock=false) nunca descontó stock al
        // agregarse a la orden: devolverlo acá crearía existencias fantasma
        // que nadie sabría de dónde salieron.
        if (!part.sparePart.trackStock) continue;

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

  /**
   * POST /work-orders/:id/collection-document — SOLO ADMIN (RBAC en el
   * controller). Genera el consecutivo de la cuenta de cobro de una orden
   * cerrada, o lo devuelve sin consumir otro si ya existe (idempotente).
   *
   * No se emite cobro sobre una orden abierta: el total todavía puede
   * cambiar (repuestos, mano de obra, descuentos) hasta que se congela en
   * COMPLETED — igual candado de negocio que PaymentsService para
   * registrar abonos.
   */
  async generateCollectionDocument(
    user: AuthenticatedUser,
    id: string,
  ): Promise<WorkOrderView> {
    const order = await this.findOne(user, id); // candado + 404 si es ajena

    if (!CLOSED_STATUSES.includes(order.status)) {
      throw new ConflictException(
        'Solo se puede generar la cuenta de cobro de una orden cerrada (Completada o Entregada): el total todavía puede cambiar mientras la orden sigue abierta.',
      );
    }

    // Idempotente: si ya tiene número, se devuelve tal cual — no se
    // consume otro consecutivo por volver a entrar a la pantalla.
    if (order.collectionNumber !== null) {
      return order;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // El UPDATE con increment toma un lock de fila sobre Company hasta el
      // commit — dos generaciones simultáneas para la misma empresa se
      // serializan acá, mismo patrón que el consecutivo de órdenes.
      const company = await tx.company.update({
        where: { id: user.companyId },
        data: { nextCollectionNumber: { increment: 1 } },
        select: { nextCollectionNumber: true },
      });

      // Ya con el lock tomado, releo la orden: si perdió la carrera contra
      // otra petición concurrente que alcanzó a generar el número mientras
      // esta esperaba el lock, no lo piso con uno nuevo.
      const current = await tx.workOrder.findUniqueOrThrow({
        where: { id },
        select: { collectionNumber: true },
      });
      if (current.collectionNumber !== null) {
        return tx.workOrder.findUniqueOrThrow({
          where: { id },
          include: WORK_ORDER_INCLUDE,
        });
      }

      const result = await tx.workOrder.update({
        where: { id },
        data: {
          collectionNumber: company.nextCollectionNumber - 1,
          collectionIssuedAt: new Date(),
        },
        include: WORK_ORDER_INCLUDE,
      });

      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId: id,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.COLLECTION_DOC_GENERATED,
          newValue: formatActivityCollectionNumber(result.collectionNumber!),
          isFinancial: true,
        },
        tx,
      );

      return result;
    });

    return this.toView(updated, user.role);
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

  /** "Marca Modelo — Ubicación" para los eventos de bitácora de equipos vinculados/desvinculados. */
  private formatEquipmentLabel(equipment: {
    brand: string;
    model: string;
    location: string | null;
  }): string {
    return equipment.location
      ? `${equipment.brand} ${equipment.model} — ${equipment.location}`
      : `${equipment.brand} ${equipment.model}`;
  }

  /**
   * Aplana `equipmentLinks` (filas de la tabla intermedia, cada una con su
   * `equipment` anidado) a `equipments`: un array plano de equipos, que es
   * la forma que consume el frontend. Prisma no ofrece un include que
   * devuelva esto directo porque la relación es explícita (tiene columnas
   * propias: companyId, createdAt), no un m-a-m implícito.
   */
  /** RBAC financiero: directCostAmount/directCostDescription solo para ADMIN. */
  private toView(order: WorkOrderWithRelations, role: Role): WorkOrderView {
    const { equipmentLinks, directCostAmount, directCostDescription, ...rest } =
      order;
    return {
      ...rest,
      equipments: equipmentLinks.map((link) => link.equipment),
      ...(role === Role.ADMIN && { directCostAmount, directCostDescription }),
    };
  }
}
