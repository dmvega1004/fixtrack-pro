import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Retention } from 'database';
import { PrismaService } from '../prisma.service';
import { CreateRetentionDto } from './dto/create-retention.dto';
import { UpdateRetentionDto } from './dto/update-retention.dto';

/**
 * Catálogo de retenciones de la empresa ("Mi empresa" → tarjeta
 * "Retenciones"). SOLO ADMIN (RBAC en el controller) — configuración
 * financiera del tenant, mismo criterio que PATCH /company/me.
 *
 * list() devuelve TODO el catálogo (activas e inactivas): la propia
 * pantalla de "Mi empresa" necesita ver y poder reactivar las inactivas;
 * el frontend de la ficha del cliente y de la orden filtra `active` al
 * ofrecer casillas nuevas (una retención ya aplicada a una orden sigue
 * apareciendo ahí aunque se haya desactivado — ver WorkOrderRetention).
 */
@Injectable()
export class RetentionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string): Promise<Retention[]> {
    return this.prisma.retention.findMany({
      where: { companyId }, // candado
      orderBy: { position: 'asc' },
    });
  }

  async create(
    companyId: string,
    dto: CreateRetentionDto,
  ): Promise<Retention> {
    this.ensureBaseConsistency(dto.base, dto.baseRetentionId);

    if (dto.base === 'RETENTION') {
      await this.ensureBaseRetentionExists(companyId, dto.baseRetentionId!);
    }

    const { _max } = await this.prisma.retention.aggregate({
      where: { companyId }, // candado
      _max: { position: true },
    });

    return this.prisma.retention.create({
      data: {
        companyId, // candado
        name: dto.name.trim(),
        rate: dto.rate,
        base: dto.base,
        baseRetentionId:
          dto.base === 'RETENTION' ? dto.baseRetentionId : null,
        position: (_max.position ?? -1) + 1,
      },
    });
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateRetentionDto,
  ): Promise<Retention> {
    const existing = await this.findOneOrThrow(companyId, id);

    // Estado EFECTIVO tras el merge (no solo lo que trae este PATCH
    // parcial) — mismo criterio que ClientsService.update con
    // reportFormatEnabled/Title.
    const effectiveBase = dto.base ?? existing.base;
    const effectiveBaseRetentionId =
      dto.baseRetentionId !== undefined
        ? dto.baseRetentionId
        : existing.baseRetentionId;

    this.ensureBaseConsistency(effectiveBase, effectiveBaseRetentionId);

    if (effectiveBase === 'RETENTION') {
      if (effectiveBaseRetentionId === id) {
        throw new BadRequestException(
          'Una retención no puede referenciarse a sí misma',
        );
      }
      await this.ensureBaseRetentionExists(
        companyId,
        effectiveBaseRetentionId!,
      );
      await this.ensureNoCycle(companyId, id, effectiveBaseRetentionId!);
    }

    return this.prisma.retention.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        rate: dto.rate,
        base: dto.base,
        baseRetentionId:
          effectiveBase === 'RETENTION' ? effectiveBaseRetentionId : null,
        active: dto.active,
      },
    });
  }

  async reorder(companyId: string, ids: string[]): Promise<Retention[]> {
    const existing = await this.prisma.retention.findMany({
      where: { companyId }, // candado
      select: { id: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));

    if (
      ids.length !== existingIds.size ||
      ids.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException(
        'La lista de reordenamiento debe incluir exactamente todas las retenciones de la empresa, sin repetir ninguna',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.retention.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    return this.list(companyId);
  }

  private async findOneOrThrow(
    companyId: string,
    id: string,
  ): Promise<Retention> {
    const retention = await this.prisma.retention.findFirst({
      where: { id, companyId }, // candado
    });
    if (!retention) {
      throw new NotFoundException(`Retención ${id} no encontrada`);
    }
    return retention;
  }

  private ensureBaseConsistency(
    base: string,
    baseRetentionId: string | null | undefined,
  ): void {
    if (base === 'RETENTION' && !baseRetentionId) {
      throw new BadRequestException(
        'baseRetentionId es obligatorio cuando base es RETENTION',
      );
    }
    if (base !== 'RETENTION' && baseRetentionId) {
      throw new BadRequestException(
        'baseRetentionId solo aplica cuando base es RETENTION',
      );
    }
  }

  private async ensureBaseRetentionExists(
    companyId: string,
    baseRetentionId: string,
  ): Promise<void> {
    const base = await this.prisma.retention.findFirst({
      where: { id: baseRetentionId, companyId }, // candado
      select: { id: true },
    });
    if (!base) {
      throw new NotFoundException(
        `La retención base ${baseRetentionId} no existe en tu empresa`,
      );
    }
  }

  /**
   * Recorre la cadena baseRetentionId de TODO el catálogo de la empresa,
   * simulando el cambio propuesto (nodeId → newBaseId), y rechaza si en
   * algún punto se vuelve a llegar a nodeId — referencia circular directa
   * (A → A) o indirecta (A → B → A). Una retención que se apunta a sí
   * misma colgaría calculateRetentions (ver billing.util.ts) en un bucle
   * infinito si no se rechazara acá, al guardar.
   */
  private async ensureNoCycle(
    companyId: string,
    nodeId: string,
    newBaseId: string,
  ): Promise<void> {
    const all = await this.prisma.retention.findMany({
      where: { companyId }, // candado
      select: { id: true, baseRetentionId: true },
    });

    const baseOf = new Map(all.map((r) => [r.id, r.baseRetentionId]));
    baseOf.set(nodeId, newBaseId);

    let current: string | null = newBaseId;
    const visited = new Set<string>();
    while (current) {
      if (current === nodeId) {
        throw new ConflictException(
          'Referencia circular: esta retención terminaría dependiendo de sí misma, directa o indirectamente',
        );
      }
      // Ciclo ajeno ya existente en el catálogo (no involucra a nodeId):
      // no es el error que este guardado debe reportar — corta para no
      // recorrer para siempre.
      if (visited.has(current)) break;
      visited.add(current);
      current = baseOf.get(current) ?? null;
    }
  }
}
