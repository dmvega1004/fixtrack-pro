import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Quote, QuoteStatus } from 'database';
import { addDaysUTC, todayDateOnly } from '../common/date-only.util';
import { PrismaService } from '../prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { DecideQuoteDto } from './dto/decide-quote.dto';
import { PostponeFollowUpDto } from './dto/postpone-follow-up.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { calculateQuoteBilling } from './quote-billing.util';

/** Relaciones que acompañan a cada cotización en las respuestas. */
const QUOTE_INCLUDE = {
  client: {
    select: { id: true, name: true, documentType: true, documentNumber: true },
  },
  equipmentLinks: {
    select: {
      equipment: {
        select: { id: true, brand: true, model: true, serialNumber: true, location: true },
      },
    },
  },
  items: { orderBy: { position: 'asc' } },
  createdBy: { select: { id: true, name: true } },
} as const;

type QuoteWithRelations = Prisma.QuoteGetPayload<{ include: typeof QUOTE_INCLUDE }>;

export interface QuoteEquipmentSummary {
  id: string;
  brand: string;
  model: string;
  serialNumber: string | null;
  location: string | null;
}

export interface QuoteItemView {
  id: string;
  position: number;
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  sparePartId: string | null;
}

export interface QuoteBilling {
  subtotal: string;
  discountAmount: string;
  base: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  /** true a partir de SENT: el total mostrado es el guardado, no se recalcula. */
  isFrozen: boolean;
}

export type QuoteView = Omit<Quote, 'items'> & {
  client: { id: string; name: string; documentType: string | null; documentNumber: string | null };
  equipments: QuoteEquipmentSummary[];
  items: QuoteItemView[];
  createdBy: { id: string; name: string } | null;
  billing: QuoteBilling;
  /**
   * Derivado al leer, NUNCA guardado: SENT cuya validUntil ya pasó. Ver
   * enum QuoteStatus en el schema — a propósito no existe QuoteStatus.EXPIRED.
   */
  isExpired: boolean;
};

/** Filtro especial de listado: no es un QuoteStatus real, se traduce en buildWhere. */
export type QuoteStatusFilter = QuoteStatus | 'EXPIRED' | 'FOLLOW_UP';

export interface QuoteFindAllFilters {
  status?: QuoteStatusFilter;
  /** Número de cotización, nombre/documento del cliente o título. */
  search?: string;
  take?: number;
  skip?: number;
}

/**
 * REGLA DE ORO MULTI-TENANT: `companyId` es el primer parámetro obligatorio
 * de todos los métodos. RBAC (ADMIN/COORDINATOR, ningún acceso para
 * TECHNICIAN) se aplica en el controller — este service no conoce roles.
 */
@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreateQuoteDto,
  ): Promise<QuoteView> {
    await this.ensureClientBelongsToCompany(companyId, dto.clientId);

    if (dto.equipmentIds && dto.equipmentIds.length > 0) {
      await this.ensureEquipmentsBelongToClient(companyId, dto.equipmentIds, dto.clientId);
    }
    await this.ensureSparePartsBelongToCompany(companyId, dto.items);

    // Condiciones comerciales: se COPIAN de Company.default* — lo que
    // venga en el dto tiene prioridad, lo que se omita se rellena acá. Se
    // copian (no se referencian) para que una cotización ya enviada
    // conserve las condiciones con que se envió aunque estos valores por
    // defecto cambien después.
    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: {
        defaultPaymentTerms: true,
        defaultDeliveryTime: true,
        defaultWarrantyTerms: true,
        defaultExclusions: true,
        defaultValidityDays: true,
        taxRate: true,
      },
    });

    const created = await this.prisma.quote.create({
      data: {
        companyId, // candado
        clientId: dto.clientId,
        title: dto.title.trim(),
        siteName: dto.siteName?.trim(),
        scope: dto.scope.trim(),
        discountAmount: dto.discountAmount ?? 0,
        paymentTerms: dto.paymentTerms?.trim() ?? company.defaultPaymentTerms,
        deliveryTime: dto.deliveryTime?.trim() ?? company.defaultDeliveryTime,
        warrantyTerms: dto.warrantyTerms?.trim() ?? company.defaultWarrantyTerms,
        exclusions: dto.exclusions?.trim() ?? company.defaultExclusions,
        validityDays: dto.validityDays ?? company.defaultValidityDays,
        createdById: userId,
        // status: DRAFT (default de Prisma), quoteNumber: null hasta enviar
        items: {
          createMany: {
            data: dto.items.map((item, index) => ({
              companyId, // candado
              position: index,
              description: item.description.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sparePartId: item.sparePartId,
            })),
          },
        },
        equipmentLinks:
          dto.equipmentIds && dto.equipmentIds.length > 0
            ? {
                createMany: {
                  data: dto.equipmentIds.map((equipmentId) => ({
                    equipmentId,
                    companyId, // candado
                  })),
                },
              }
            : undefined,
      },
      include: QUOTE_INCLUDE,
    });

    return this.toView(created, company.taxRate);
  }

  async findAll(companyId: string, filters: QuoteFindAllFilters = {}): Promise<QuoteView[]> {
    // FOLLOW_UP se ordena de más antigua a más reciente (sentAt asc): la
    // primera fila es a quien hay que llamar primero. El resto del listado
    // mantiene el orden por creación más reciente de siempre.
    const orderBy: Prisma.QuoteOrderByWithRelationInput[] =
      filters.status === 'FOLLOW_UP' ? [{ sentAt: 'asc' }] : [{ createdAt: 'desc' }];

    const [quotes, company] = await Promise.all([
      this.prisma.quote.findMany({
        where: this.buildWhere(companyId, filters),
        include: QUOTE_INCLUDE,
        orderBy,
        take: filters.take,
        skip: filters.skip,
      }),
      this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        select: { taxRate: true },
      }),
    ]);

    return quotes.map((quote) => this.toView(quote, company.taxRate));
  }

  count(companyId: string, filters: Omit<QuoteFindAllFilters, 'take' | 'skip'> = {}): Promise<number> {
    return this.prisma.quote.count({ where: this.buildWhere(companyId, filters) });
  }

  /** Ver GET /work-orders/stats — reutiliza count()/buildWhere para no duplicar el where. */
  countFollowUpDue(companyId: string): Promise<number> {
    return this.count(companyId, { status: 'FOLLOW_UP' });
  }

  async findOne(companyId: string, id: string): Promise<QuoteView> {
    const [quote, company] = await Promise.all([
      this.prisma.quote.findFirst({
        where: { id, companyId }, // candado
        include: QUOTE_INCLUDE,
      }),
      this.prisma.company.findUniqueOrThrow({
        where: { id: companyId },
        select: { taxRate: true },
      }),
    ]);

    if (!quote) {
      throw new NotFoundException(`Cotización ${id} no encontrada`);
    }

    return this.toView(quote, company.taxRate);
  }

  /**
   * PATCH /quotes/:id. Dos modos excluyentes, según el estado ACTUAL:
   * - DRAFT: cualquier campo de negocio (título, alcance, ítems, equipos,
   *   condiciones, descuento, validityDays). `followUpAt` no aplica todavía
   *   (se calcula recién al enviar) — se rechaza si viene.
   * - SENT/ACCEPTED/REJECTED: SOLO followUpAt, y nada más. Después de
   *   enviar, ni ítems ni valores ni condiciones se pueden tocar — para eso
   *   existe duplicar.
   */
  async update(companyId: string, id: string, dto: UpdateQuoteDto): Promise<QuoteView> {
    const current = await this.requireQuote(companyId, id);

    if (current.status !== QuoteStatus.DRAFT) {
      return this.updateFollowUpOnly(companyId, id, dto);
    }

    if (dto.followUpAt !== undefined) {
      throw new ConflictException(
        'followUpAt todavía no aplica: se calcula al enviar la cotización',
      );
    }

    if (dto.clientId) {
      await this.ensureClientBelongsToCompany(companyId, dto.clientId);
    }
    const effectiveClientId = dto.clientId ?? current.clientId;
    if (dto.equipmentIds !== undefined && dto.equipmentIds.length > 0) {
      await this.ensureEquipmentsBelongToClient(companyId, dto.equipmentIds, effectiveClientId);
    }
    if (dto.items !== undefined) {
      await this.ensureSparePartsBelongToCompany(companyId, dto.items);
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { taxRate: true },
    });

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        title: dto.title?.trim(),
        siteName: dto.siteName?.trim(),
        scope: dto.scope?.trim(),
        discountAmount: dto.discountAmount,
        paymentTerms: dto.paymentTerms?.trim(),
        deliveryTime: dto.deliveryTime?.trim(),
        warrantyTerms: dto.warrantyTerms?.trim(),
        exclusions: dto.exclusions?.trim(),
        validityDays: dto.validityDays,
        // Reemplazo completo (semántica PATCH), igual que equipmentIds en
        // WorkOrder: un array vacío es válido y explícito (deja la
        // cotización sin ítems); `undefined` no toca nada.
        ...(dto.items !== undefined && {
          items: {
            deleteMany: {},
            createMany: {
              data: dto.items.map((item, index) => ({
                companyId,
                position: index,
                description: item.description.trim(),
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                sparePartId: item.sparePartId,
              })),
            },
          },
        }),
        ...(dto.equipmentIds !== undefined && {
          equipmentLinks: {
            deleteMany: {},
            createMany: {
              data: dto.equipmentIds.map((equipmentId) => ({
                equipmentId,
                companyId,
              })),
            },
          },
        }),
      },
      include: QUOTE_INCLUDE,
    });

    return this.toView(updated, company.taxRate);
  }

  private async updateFollowUpOnly(
    companyId: string,
    id: string,
    dto: UpdateQuoteDto,
  ): Promise<QuoteView> {
    const otherFields = Object.entries(dto).filter(
      ([key, value]) => key !== 'followUpAt' && value !== undefined,
    );
    if (otherFields.length > 0) {
      throw new ConflictException(
        'La cotización ya fue enviada: no se puede editar (ítems, valores ni condiciones). ' +
          'Solo se puede actualizar la fecha de seguimiento, o duplicarla para enviar una versión nueva.',
      );
    }
    if (dto.followUpAt === undefined) {
      throw new ConflictException(
        'La cotización ya fue enviada: no hay nada editable en este cuerpo de la petición.',
      );
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { taxRate: true },
    });

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { followUpAt: new Date(dto.followUpAt) },
      include: QUOTE_INCLUDE,
    });

    return this.toView(updated, company.taxRate);
  }

  /**
   * POST /quotes/:id/postpone-follow-up — recalcula followUpAt = hoy +
   * days. Solo sobre cotizaciones SENT: sin decisión que tomar, es la
   * única forma de sacar una cotización de "por seguir" cuando el cliente
   * pidió más tiempo (si no, quedaría marcada como pendiente de
   * seguimiento indefinidamente).
   */
  async postponeFollowUp(companyId: string, id: string, dto: PostponeFollowUpDto): Promise<QuoteView> {
    const current = await this.requireQuote(companyId, id);
    if (current.status !== QuoteStatus.SENT) {
      throw new ConflictException('Solo se puede posponer el seguimiento de una cotización enviada');
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { taxRate: true },
    });

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { followUpAt: addDaysUTC(todayDateOnly(), dto.days) },
      include: QUOTE_INCLUDE,
    });

    return this.toView(updated, company.taxRate);
  }

  /**
   * POST /quotes/:id/send — DRAFT → SENT, transaccional: asigna
   * quoteNumber, congela taxRateApplied/subtotalAmount/totalAmount, y
   * calcula sentAt/validUntil/followUpAt. Mismo patrón que
   * WorkOrdersService.create para el consecutivo: el UPDATE con increment
   * sobre Company toma un lock de fila hasta el commit, así que dos envíos
   * simultáneos para la misma empresa se serializan y nunca repiten
   * número (el @@unique([companyId, quoteNumber]) es el respaldo final).
   */
  async send(companyId: string, id: string): Promise<QuoteView> {
    const current = await this.requireQuote(companyId, id);

    if (current.status !== QuoteStatus.DRAFT) {
      throw new ConflictException('Solo se puede enviar una cotización en borrador');
    }
    if (current.items.length === 0) {
      throw new ConflictException('La cotización no tiene ítems: agrega al menos uno antes de enviarla');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.update({
        where: { id: companyId },
        data: { nextQuoteNumber: { increment: 1 } },
        select: { nextQuoteNumber: true, taxRate: true, quoteFollowUpDays: true },
      });

      const itemsTotal = current.items.reduce(
        (acc, item) => acc.add(item.unitPrice.mul(item.quantity)),
        new Prisma.Decimal(0),
      );
      const { subtotal, total } = calculateQuoteBilling({
        itemsTotal,
        discountAmount: current.discountAmount,
        taxRate: company.taxRate,
      });

      const today = todayDateOnly();

      return tx.quote.update({
        where: { id },
        data: {
          quoteNumber: company.nextQuoteNumber - 1,
          status: QuoteStatus.SENT,
          taxRateApplied: company.taxRate,
          subtotalAmount: subtotal,
          totalAmount: total,
          sentAt: new Date(),
          validUntil: addDaysUTC(today, current.validityDays),
          followUpAt: addDaysUTC(today, company.quoteFollowUpDays),
        },
        include: QUOTE_INCLUDE,
      });
    });

    return this.toView(updated, updated.taxRateApplied!);
  }

  /**
   * POST /quotes/:id/decide — SENT → ACCEPTED/REJECTED. El motivo de
   * rechazo es obligatorio a propósito: sin él no hay forma de saber
   * después si se perdió por precio, por tiempo de entrega o por falta de
   * seguimiento — el dato que hace valioso este módulo.
   */
  async decide(companyId: string, id: string, dto: DecideQuoteDto): Promise<QuoteView> {
    if (dto.status !== QuoteStatus.ACCEPTED && dto.status !== QuoteStatus.REJECTED) {
      throw new BadRequestException('status debe ser ACCEPTED o REJECTED');
    }

    const current = await this.requireQuote(companyId, id);
    if (current.status !== QuoteStatus.SENT) {
      throw new ConflictException('Solo se puede decidir una cotización enviada');
    }

    if (dto.status === QuoteStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('rejectionReason es obligatorio para marcar la cotización como rechazada');
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { taxRate: true },
    });

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: dto.status,
        decidedAt: new Date(),
        rejectionReason: dto.status === QuoteStatus.REJECTED ? dto.rejectionReason!.trim() : null,
      },
      include: QUOTE_INCLUDE,
    });

    return this.toView(updated, company.taxRate);
  }

  /**
   * POST /quotes/:id/duplicate — crea una cotización nueva en DRAFT, con
   * los mismos datos e ítems, sin número. Es la única forma de "modificar"
   * una cotización ya enviada: se propone una versión nueva, la anterior
   * queda intacta como lo que el cliente de verdad recibió.
   */
  async duplicate(companyId: string, userId: string, id: string): Promise<QuoteView> {
    const source = await this.requireQuote(companyId, id);

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { taxRate: true },
    });

    const duplicated = await this.prisma.quote.create({
      data: {
        companyId,
        clientId: source.clientId,
        title: source.title,
        siteName: source.siteName,
        scope: source.scope,
        discountAmount: source.discountAmount,
        paymentTerms: source.paymentTerms,
        deliveryTime: source.deliveryTime,
        warrantyTerms: source.warrantyTerms,
        exclusions: source.exclusions,
        validityDays: source.validityDays,
        sourceWorkOrderId: source.sourceWorkOrderId,
        createdById: userId,
        // status: DRAFT, quoteNumber: null — como toda cotización nueva
        items: {
          createMany: {
            data: source.items.map((item, index) => ({
              companyId,
              position: index,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sparePartId: item.sparePartId,
            })),
          },
        },
        equipmentLinks:
          source.equipmentLinks.length > 0
            ? {
                createMany: {
                  data: source.equipmentLinks.map((link) => ({
                    equipmentId: link.equipment.id,
                    companyId,
                  })),
                },
              }
            : undefined,
      },
      include: QUOTE_INCLUDE,
    });

    return this.toView(duplicated, company.taxRate);
  }

  /** DELETE /quotes/:id — solo DRAFT (una cotización enviada es un documento ya entregado). */
  async remove(companyId: string, id: string): Promise<QuoteView> {
    const current = await this.requireQuote(companyId, id);
    if (current.status !== QuoteStatus.DRAFT) {
      throw new ConflictException('Solo se puede eliminar una cotización en borrador');
    }

    const company = await this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { taxRate: true },
    });

    await this.prisma.quote.delete({ where: { id } });

    return this.toView(current, company.taxRate);
  }

  /** Carga la cotización con candado companyId, 404 si no existe o es de otra empresa. */
  private async requireQuote(companyId: string, id: string): Promise<QuoteWithRelations> {
    const quote = await this.prisma.quote.findFirst({
      where: { id, companyId },
      include: QUOTE_INCLUDE,
    });
    if (!quote) {
      throw new NotFoundException(`Cotización ${id} no encontrada`);
    }
    return quote;
  }

  /**
   * `where` compartido entre findAll/count: candado de tenant + filtro de
   * estado (incluido el derivado "EXPIRED") + búsqueda. El OR del
   * buscador queda ANIDADO como condición propia (AND), nunca suelto al
   * mismo nivel que companyId — si quedara suelto, el aislamiento entre
   * empresas desaparecería en silencio.
   */
  private buildWhere(
    companyId: string,
    filters: Omit<QuoteFindAllFilters, 'take' | 'skip'>,
  ): Prisma.QuoteWhereInput {
    const searchCondition = this.buildSearchCondition(filters.search);

    let statusCondition: Prisma.QuoteWhereInput = {};
    if (filters.status === 'EXPIRED') {
      // Derivado, nunca guardado: SENT cuya validUntil ya pasó.
      statusCondition = {
        status: QuoteStatus.SENT,
        validUntil: { lt: todayDateOnly() },
      };
    } else if (filters.status === 'FOLLOW_UP') {
      // Derivado, nunca guardado: SENT sin decisión cuyo followUpAt ya
      // pasó o es hoy — incluye las vencidas a propósito.
      statusCondition = {
        status: QuoteStatus.SENT,
        followUpAt: { lte: todayDateOnly() },
      };
    } else if (filters.status) {
      statusCondition = { status: filters.status };
    }

    return {
      companyId, // candado
      ...statusCondition,
      ...(searchCondition ? { AND: searchCondition } : {}),
    };
  }

  /**
   * Buscador de una sola casilla: número de cotización, nombre/documento
   * del cliente y título. Términos de menos de 2 caracteres se ignoran.
   */
  private buildSearchCondition(search: string | undefined): Prisma.QuoteWhereInput | null {
    const term = search?.trim();
    if (!term || term.length < 2) {
      return null;
    }

    const conditions: Prisma.QuoteWhereInput[] = [
      { client: { name: { contains: term, mode: 'insensitive' } } },
      { client: { documentNumber: { contains: term, mode: 'insensitive' } } },
      { title: { contains: term, mode: 'insensitive' } },
    ];

    // "COT-0015", "0015", "15": se queda solo con los dígitos y les quita
    // los ceros a la izquierda, para que "0015" encuentre quoteNumber=15.
    const digits = term.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (digits.length > 0) {
      const numericTerm = Number(digits);
      if (Number.isSafeInteger(numericTerm)) {
        conditions.push({ quoteNumber: numericTerm });
      }
    }

    return { OR: conditions };
  }

  /** Validación cruzada multi-tenant de la relación Quote → Client. */
  private async ensureClientBelongsToCompany(companyId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId },
      select: { id: true },
    });
    if (!client) {
      throw new NotFoundException(`Cliente ${clientId} no encontrado en tu empresa`);
    }
  }

  /** Cada equipo debe ser de MI empresa Y del cliente indicado — mismo criterio que WorkOrder. */
  private async ensureEquipmentsBelongToClient(
    companyId: string,
    equipmentIds: string[],
    clientId: string,
  ): Promise<void> {
    const equipments = await this.prisma.equipment.findMany({
      where: { id: { in: equipmentIds }, companyId },
      select: { id: true, clientId: true },
    });

    const foundIds = new Set(equipments.map((e) => e.id));
    const missingIds = equipmentIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Equipo(s) no encontrado(s) en tu empresa: ${missingIds.join(', ')}`);
    }

    const mismatched = equipments.filter((e) => e.clientId !== clientId);
    if (mismatched.length > 0) {
      throw new ConflictException(
        `Los equipos ${mismatched.map((e) => e.id).join(', ')} no pertenecen al cliente ${clientId}`,
      );
    }
  }

  /**
   * Validación cruzada multi-tenant del sparePartId opcional de cada
   * ítem — NO valida stock ni lo descuenta (una cotización nunca mueve
   * inventario), solo que el repuesto referenciado sea de MI empresa.
   */
  private async ensureSparePartsBelongToCompany(
    companyId: string,
    items: { sparePartId?: string }[],
  ): Promise<void> {
    const sparePartIds = [...new Set(items.map((i) => i.sparePartId).filter((id): id is string => !!id))];
    if (sparePartIds.length === 0) return;

    const found = await this.prisma.sparePart.findMany({
      where: { id: { in: sparePartIds }, companyId },
      select: { id: true },
    });
    const foundIds = new Set(found.map((p) => p.id));
    const missingIds = sparePartIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(`Repuesto(s) no encontrado(s) en tu empresa: ${missingIds.join(', ')}`);
    }
  }

  private buildBilling(quote: QuoteWithRelations, companyTaxRate: Prisma.Decimal): QuoteBilling {
    const isFrozen = quote.totalAmount !== null;
    const taxRate = isFrozen ? quote.taxRateApplied! : companyTaxRate;

    const itemsTotal = quote.items.reduce(
      (acc, item) => acc.add(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    const { subtotal, base, taxAmount, total } = calculateQuoteBilling({
      itemsTotal,
      discountAmount: quote.discountAmount,
      taxRate,
    });

    return {
      subtotal: isFrozen ? quote.subtotalAmount!.toFixed(2) : subtotal.toFixed(2),
      discountAmount: quote.discountAmount.toFixed(2),
      base: base.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: isFrozen ? quote.totalAmount!.toFixed(2) : total.toFixed(2),
      isFrozen,
    };
  }

  private toView(quote: QuoteWithRelations, companyTaxRate: Prisma.Decimal): QuoteView {
    const { items, equipmentLinks, ...rest } = quote;

    const today = todayDateOnly();
    const isExpired = quote.status === QuoteStatus.SENT && quote.validUntil !== null && quote.validUntil < today;

    return {
      ...rest,
      equipments: equipmentLinks.map((link) => link.equipment),
      items: items.map((item) => ({
        id: item.id,
        position: item.position,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.unitPrice.mul(item.quantity).toFixed(2),
        sparePartId: item.sparePartId,
      })),
      billing: this.buildBilling(quote, companyTaxRate),
      isExpired,
    };
  }
}
