import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { AssistedDraftStatus, OrderStatus } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { estimateCostUsd } from './drafting-pricing';
import {
  DRAFTING_PROVIDER,
  DraftingProvider,
  DraftingProviderError,
  DraftingUsage,
} from './drafting-provider';
import {
  buildSystemPrompt,
  buildUserPrompt,
  DRAFT_OUTPUT_SCHEMA,
  DraftingContext,
  DraftOutput,
  isDraftOutput,
} from './drafting-prompt';
import { DraftingTemplatesService } from './drafting-templates.service';

/** Tope mensual por empresa cuando Company.assistedDraftMonthlyLimit es null. */
const DEFAULT_MONTHLY_LIMIT = 100;

/**
 * Una reserva PENDING más vieja que esto es de un proceso que murió a mitad
 * de la llamada: deja de contar para la cuota (la llamada real corta a los
 * 90 s, ver AnthropicDraftingProvider).
 */
const STALE_PENDING_MS = 10 * 60 * 1000;

/** Órdenes anteriores del mismo equipo que se envían como contexto. */
const HISTORY_PER_EQUIPMENT = 3;
const HISTORY_TEXT_MAX_CHARS = 600;

/** Colombia no tiene horario de verano: UTC-5 fijo (ver activity-labels.ts). */
const BOGOTA_UTC_OFFSET_HOURS = 5;

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export interface AssistedDraftStatusView {
  /** false = función deshabilitada por configuración del servidor. */
  available: boolean;
  limit: number;
  used: number;
  remaining: number;
}

/**
 * Resultado SIEMPRE de negocio, nunca un error técnico hacia el técnico:
 * cuota agotada, función deshabilitada o proveedor caído se devuelven como
 * un `outcome` que el frontend traduce a un mensaje claro ("puedes seguir
 * escribiendo a mano").
 */
export type AssistedDraftResult =
  | {
      outcome: 'OK';
      draft: DraftOutput;
      usageId: string;
      quota: AssistedDraftStatusView;
    }
  | { outcome: 'QUOTA_EXHAUSTED'; quota: AssistedDraftStatusView }
  | { outcome: 'UNAVAILABLE' }
  | { outcome: 'PROVIDER_ERROR' };

function formatOrderNumber(n: number): string {
  return `OT-${String(n).padStart(4, '0')}`;
}

function truncate(text: string | null, max: number): string | null {
  if (!text) return text;
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Primer instante del mes calendario en curso, hora de Bogotá. */
export function currentMonthStart(now = new Date()): Date {
  const bogota = new Date(now.getTime() - BOGOTA_UTC_OFFSET_HOURS * 3_600_000);
  return new Date(
    Date.UTC(
      bogota.getUTCFullYear(),
      bogota.getUTCMonth(),
      1,
      BOGOTA_UTC_OFFSET_HOURS,
    ),
  );
}

/**
 * Redacción asistida del informe técnico: apuntes sueltos → Diagnóstico,
 * Observaciones y Sugerencias, según docs/plantillas-redaccion.md.
 *
 * Devuelve un BORRADOR: este servicio nunca escribe en la orden. El
 * técnico revisa, edita y guarda con las acciones de siempre (ver
 * UpdateWorkOrderDto.assistedFields para la trazabilidad en bitácora).
 *
 * Cada llamada deja una fila en AssistedDraftUsage: reserva de cuota
 * (bajo candado por empresa) + tokens y costo estimado reales.
 */
@Injectable()
export class AssistedDraftingService implements OnModuleInit {
  private readonly logger = new Logger(AssistedDraftingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly templates: DraftingTemplatesService,
    @Inject(DRAFTING_PROVIDER) private readonly provider: DraftingProvider,
  ) {}

  onModuleInit(): void {
    const problem = this.provider.configurationProblem();
    if (problem) {
      this.logger.error(`REDACCIÓN ASISTIDA DESHABILITADA: ${problem}`);
    } else {
      this.logger.log(
        `Redacción asistida: proveedor ${this.provider.name}, modelo ${this.provider.model}`,
      );
    }
  }

  private isAvailable(): boolean {
    return (
      this.provider.configurationProblem() === null &&
      this.templates.load() !== null
    );
  }

  async getStatus(user: AuthenticatedUser): Promise<AssistedDraftStatusView> {
    const [limit, used] = await Promise.all([
      this.monthlyLimit(user.companyId),
      this.countUsedThisMonth(this.prisma, user.companyId),
    ]);
    return {
      available: this.isAvailable(),
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  }

  async generate(
    user: AuthenticatedUser,
    workOrderId: string,
    notes: string,
  ): Promise<AssistedDraftResult> {
    // Pertenencia al tenant + "el técnico solo ve SUS órdenes": la regla la
    // decide siempre WorkOrdersService.findOne (404 si no aplica).
    const order = await this.workOrdersService.findOne(user, workOrderId);
    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new ConflictException('La orden está cerrada y no admite cambios');
    }

    // Falla cerrada: sin plantillas o sin proveedor configurado no se
    // genera nada — ni se reserva cuota.
    const templates = this.templates.load();
    if (!templates || this.provider.configurationProblem()) {
      return { outcome: 'UNAVAILABLE' };
    }

    const reservation = await this.reserve(user, workOrderId, templates.hash);
    if (!reservation) {
      return { outcome: 'QUOTA_EXHAUSTED', quota: await this.getStatus(user) };
    }

    const context = await this.buildContext(user.companyId, workOrderId);
    const startedAt = Date.now();

    try {
      const response = await this.provider.generate({
        system: buildSystemPrompt(templates.content),
        user: buildUserPrompt(notes, context),
        outputSchema: DRAFT_OUTPUT_SCHEMA,
      });

      if (!isDraftOutput(response.json)) {
        throw new DraftingProviderError(
          'SCHEMA_MISMATCH',
          'La respuesta no tiene la forma esperada',
          response.usage,
        );
      }

      await this.finish(
        reservation,
        AssistedDraftStatus.SUCCEEDED,
        startedAt,
        response.usage,
      );

      return {
        outcome: 'OK',
        draft: response.json,
        usageId: reservation,
        quota: await this.getStatus(user),
      };
    } catch (error) {
      const code =
        error instanceof DraftingProviderError ? error.code : 'UNEXPECTED';
      const usage =
        error instanceof DraftingProviderError ? error.usage : undefined;
      this.logger.warn(
        `Redacción asistida falló (${code}) en la orden ${workOrderId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await this.finish(
        reservation,
        AssistedDraftStatus.FAILED,
        startedAt,
        usage,
        code,
      );
      return { outcome: 'PROVIDER_ERROR' };
    }
  }

  /**
   * Reserva un cupo del mes o devuelve null si se agotó. El candado de
   * transacción por empresa serializa las reservas concurrentes: dos
   * técnicos generando a la vez no pueden pasar ambos el conteo con el
   * último cupo.
   */
  private async reserve(
    user: AuthenticatedUser,
    workOrderId: string,
    templatesHash: string,
  ): Promise<string | null> {
    const limit = await this.monthlyLimit(user.companyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`assisted-draft:${user.companyId}`}))`;

      const used = await this.countUsedThisMonth(tx, user.companyId);
      if (used >= limit) return null;

      const row = await tx.assistedDraftUsage.create({
        data: {
          companyId: user.companyId,
          workOrderId,
          userId: user.userId,
          provider: this.provider.name,
          model: this.provider.model,
          templatesHash,
        },
        select: { id: true },
      });
      return row.id;
    });
  }

  private async finish(
    usageId: string,
    status: AssistedDraftStatus,
    startedAt: number,
    usage?: DraftingUsage,
    errorCode?: string,
  ): Promise<void> {
    await this.prisma.assistedDraftUsage.update({
      where: { id: usageId },
      data: {
        status,
        latencyMs: Date.now() - startedAt,
        errorCode: errorCode ?? null,
        ...(usage && {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          estimatedCostUsd: estimateCostUsd(this.provider.model, usage),
        }),
      },
    });
  }

  /** SUCCEEDED + PENDING vigentes del mes; las FAILED no consumen cuota. */
  private countUsedThisMonth(
    client: Pick<PrismaService, 'assistedDraftUsage'>,
    companyId: string,
  ): Promise<number> {
    return client.assistedDraftUsage.count({
      where: {
        companyId,
        createdAt: { gte: currentMonthStart() },
        OR: [
          { status: AssistedDraftStatus.SUCCEEDED },
          {
            status: AssistedDraftStatus.PENDING,
            createdAt: { gte: new Date(Date.now() - STALE_PENDING_MS) },
          },
        ],
      },
    });
  }

  private async monthlyLimit(companyId: string): Promise<number> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { assistedDraftMonthlyLimit: true },
    });
    if (company?.assistedDraftMonthlyLimit != null) {
      return company.assistedDraftMonthlyLimit;
    }
    const fromEnv = Number(process.env.ASSIST_MONTHLY_LIMIT);
    return Number.isInteger(fromEnv) && fromEnv >= 0
      ? fromEnv
      : DEFAULT_MONTHLY_LIMIT;
  }

  /**
   * Lo que el sistema ya sabe de la orden. Solo nombres y cantidades de
   * repuestos — ningún precio ni costo sale hacia el proveedor.
   */
  private async buildContext(
    companyId: string,
    workOrderId: string,
  ): Promise<DraftingContext> {
    const order = await this.prisma.workOrder.findFirstOrThrow({
      where: { id: workOrderId, companyId },
      select: {
        orderNumber: true,
        serviceType: true,
        description: true,
        client: { select: { name: true } },
        equipmentLinks: {
          select: {
            equipment: {
              select: {
                id: true,
                brand: true,
                model: true,
                serialNumber: true,
                location: true,
              },
            },
          },
        },
        parts: {
          select: { quantity: true, sparePart: { select: { name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const equipments = order.equipmentLinks.map((link) => link.equipment);

    const history = (
      await Promise.all(
        equipments.map(async (equipment) => {
          const links = await this.prisma.workOrderEquipment.findMany({
            where: {
              companyId,
              equipmentId: equipment.id,
              workOrderId: { not: workOrderId },
            },
            orderBy: { workOrder: { createdAt: 'desc' } },
            take: HISTORY_PER_EQUIPMENT,
            select: {
              workOrder: {
                select: {
                  orderNumber: true,
                  serviceType: true,
                  serviceDate: true,
                  createdAt: true,
                  diagnosis: true,
                  observations: true,
                },
              },
            },
          });
          return links.map(({ workOrder: past }) => ({
            orderNumber: formatOrderNumber(past.orderNumber),
            date: (past.serviceDate ?? past.createdAt)
              .toISOString()
              .slice(0, 10),
            serviceType: past.serviceType,
            equipment: `${equipment.brand} ${equipment.model}`,
            diagnosis: truncate(past.diagnosis, HISTORY_TEXT_MAX_CHARS),
            observations: truncate(past.observations, HISTORY_TEXT_MAX_CHARS),
          }));
        }),
      )
    ).flat();

    return {
      orderNumber: formatOrderNumber(order.orderNumber),
      serviceType: order.serviceType,
      clientName: order.client.name,
      description: order.description,
      equipments: equipments.map(
        ({ brand, model, serialNumber, location }) => ({
          brand,
          model,
          serialNumber,
          location,
        }),
      ),
      parts: order.parts.map((part) => ({
        name: part.sparePart.name,
        quantity: part.quantity,
      })),
      history,
    };
  }
}
