import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client, Prisma, Role } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  cloudinaryRootFolder,
  CloudinaryService,
} from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { PrismaService } from '../prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

/** findAll trae estos conteos agregados en SQL — reemplaza el fetch
 * completo de /equipments y /work-orders que hacía /clientes para contar
 * en JS (ver auditoría de rendimiento). */
export type ClientListItem = Client & {
  equipmentCount: number;
  orderCount: number;
};

/** Lado máximo del logo del formato del cliente: no necesita alta resolución. */
const MAX_REPORT_FORMAT_LOGO_DIMENSION = 512;

/**
 * Campos del formato de informe propio del cliente (Módulo de Formatos).
 * RBAC: solo ADMIN/COORDINATOR pueden tocarlos (ver ensureCanConfigureReportFormat) —
 * el resto de la ficha del cliente (name, phone, city, etc.) sigue abierta a
 * cualquier rol autenticado, sin cambios.
 */
const REPORT_FORMAT_FIELD_NAMES = [
  'reportFormatEnabled',
  'reportFormatTitle',
  'reportFormatCode',
  'reportFormatVersion',
  'reportFormatDate',
  'reportFormatAccentColor',
  'reportFormatFooter',
  'reportFormatIssuer',
  'reportFormatS1Label',
  'reportFormatS1Source',
  'reportFormatS2Label',
  'reportFormatS2Source',
  'reportFormatS3Label',
  'reportFormatS3Source',
  'reportFormatIncludePhotos',
  'reportFormatPhotosLabel',
] as const satisfies readonly (keyof CreateClientDto)[];

/**
 * REGLA DE ORO MULTI-TENANT:
 * Todos los métodos reciben `companyId` como PRIMER parámetro obligatorio
 * y lo aplican en cada consulta Prisma. Es imposible invocar este servicio
 * sin el candado del tenant.
 */
@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  create(user: AuthenticatedUser, dto: CreateClientDto): Promise<Client> {
    this.ensureCanConfigureReportFormat(user, dto);
    this.ensureReportFormatTitlePresent(
      dto.reportFormatEnabled ?? false,
      dto.reportFormatTitle,
    );

    return this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim(),
        documentType: dto.documentType,
        documentNumber: dto.documentNumber?.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        paymentTermDays: dto.paymentTermDays,
        ...this.reportFormatData(dto),
        companyId: user.companyId, // candado: el cliente nace amarrado al tenant del token
      },
    });
  }

  async findAll(companyId: string): Promise<ClientListItem[]> {
    const clients = await this.prisma.client.findMany({
      where: { companyId }, // candado: solo clientes de MI empresa
      include: {
        _count: { select: { equipments: true, workOrders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return clients.map(({ _count, ...client }) => ({
      ...client,
      equipmentCount: _count.equipments,
      orderCount: _count.workOrders,
    }));
  }

  /**
   * findFirst (no findUnique) para poder combinar id + companyId.
   * Un cliente de OTRA empresa devuelve 404 — para el atacante es
   * indistinguible de un cliente inexistente (no filtramos información).
   */
  async findOne(companyId: string, id: string): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: { id, companyId }, // candado
    });

    if (!client) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return client;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    // Verifica pertenencia al tenant ANTES de tocar el registro (404 si es ajeno)
    const existing = await this.findOne(user.companyId, id);

    this.ensureCanConfigureReportFormat(user, dto);
    // Estado EFECTIVO tras el merge (no solo lo que trae este PATCH parcial):
    // si el cliente ya tenía el formato activo y este request solo cambia
    // otro campo, reportFormatEnabled no viene en el dto — hay que mirar lo
    // ya guardado, igual que otras reglas de negocio de este proyecto (ej.
    // billedAt en WorkOrdersService).
    this.ensureReportFormatTitlePresent(
      dto.reportFormatEnabled ?? existing.reportFormatEnabled,
      dto.reportFormatTitle !== undefined
        ? dto.reportFormatTitle
        : existing.reportFormatTitle,
    );

    return this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.toLowerCase().trim(),
        phone: dto.phone?.trim(),
        documentType: dto.documentType,
        documentNumber: dto.documentNumber?.trim(),
        address: dto.address?.trim(),
        city: dto.city?.trim(),
        paymentTermDays: dto.paymentTermDays,
        ...this.reportFormatData(dto),
      },
    });
  }

  /**
   * POST /clients/:id/report-format-logo — sube el logo del formato de
   * informe propio de ESTE cliente. Mismo patrón que CompanyService.updateLogo:
   * borra el logo anterior en Cloudinary si era realmente un archivo
   * nuestro (extractPublicId devuelve null para rutas ajenas/legacy).
   * Carpeta separada por cliente para no mezclar logos entre clientes.
   */
  async updateReportFormatLogo(
    companyId: string,
    id: string,
    file: Express.Multer.File | undefined,
  ): Promise<Client> {
    validateImageFile(file);

    const current = await this.findOne(companyId, id); // candado + 404

    const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: `${cloudinaryRootFolder()}/${companyId}/clients/${id}/report-format`,
      maxDimension: MAX_REPORT_FORMAT_LOGO_DIMENSION,
    });

    const updated = await this.prisma.client.update({
      where: { id },
      data: { reportFormatLogoUrl: uploaded.secure_url },
    });

    if (current.reportFormatLogoUrl) {
      const oldPublicId = this.cloudinary.extractPublicId(
        current.reportFormatLogoUrl,
      );
      if (oldPublicId) {
        await this.cloudinary.destroy(oldPublicId);
      }
    }

    return updated;
  }

  /**
   * RBAC: configurar el formato de informe propio es de ADMIN/COORDINATOR —
   * igual que el resto de la ficha del cliente en la práctica (TECHNICIAN
   * puede crear/editar clientes en campo, pero nunca este bloque en
   * particular: implica identidad de marca de otra empresa en un documento
   * oficial).
   */
  private ensureCanConfigureReportFormat(
    user: AuthenticatedUser,
    dto: CreateClientDto | UpdateClientDto,
  ): void {
    if (user.role !== Role.TECHNICIAN) return;

    const touched = REPORT_FORMAT_FIELD_NAMES.filter(
      (field) => dto[field] !== undefined,
    );
    if (touched.length > 0) {
      throw new ForbiddenException(
        `Solo ADMIN o COORDINATOR pueden configurar el formato de informe del cliente. ` +
          `Campos no permitidos: ${touched.join(', ')}`,
      );
    }
  }

  /** El título es obligatorio si el formato está activo — lo demás es opcional. */
  private ensureReportFormatTitlePresent(
    effectiveEnabled: boolean,
    effectiveTitle: string | null | undefined,
  ): void {
    if (effectiveEnabled && !effectiveTitle?.trim()) {
      throw new BadRequestException(
        'reportFormatTitle es obligatorio cuando el formato de informe está activo',
      );
    }
  }

  private reportFormatData(dto: CreateClientDto | UpdateClientDto) {
    return {
      reportFormatEnabled: dto.reportFormatEnabled,
      reportFormatTitle: dto.reportFormatTitle?.trim(),
      reportFormatCode: dto.reportFormatCode?.trim(),
      reportFormatVersion: dto.reportFormatVersion?.trim(),
      reportFormatDate: dto.reportFormatDate?.trim(),
      reportFormatAccentColor: dto.reportFormatAccentColor,
      reportFormatFooter: dto.reportFormatFooter?.trim(),
      reportFormatIssuer: dto.reportFormatIssuer?.trim(),
      reportFormatS1Label: dto.reportFormatS1Label?.trim(),
      reportFormatS1Source: dto.reportFormatS1Source,
      reportFormatS2Label: dto.reportFormatS2Label?.trim(),
      reportFormatS2Source: dto.reportFormatS2Source,
      reportFormatS3Label: dto.reportFormatS3Label?.trim(),
      reportFormatS3Source: dto.reportFormatS3Source,
      reportFormatIncludePhotos: dto.reportFormatIncludePhotos,
      reportFormatPhotosLabel: dto.reportFormatPhotosLabel?.trim(),
    };
  }

  async remove(companyId: string, id: string): Promise<Client> {
    // Verifica pertenencia al tenant ANTES de eliminar
    await this.findOne(companyId, id);

    try {
      return await this.prisma.client.delete({ where: { id } });
    } catch (error) {
      // P2003: violación de FK (onDelete: Restrict) — el cliente tiene equipos
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'No se puede eliminar: el cliente tiene equipos registrados. ' +
            'Reasigna o elimina sus equipos primero.',
        );
      }
      throw error;
    }
  }
}
