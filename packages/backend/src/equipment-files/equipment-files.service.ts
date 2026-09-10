import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EquipmentFile } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { EquipmentsService } from '../equipments/equipments.service';
import { PrismaService } from '../prisma.service';
import { SupabaseStorageService } from '../supabase/supabase-storage.service';
import { RegisterEquipmentFileDto } from './dto/register-equipment-file.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import {
  ALLOWED_EQUIPMENT_FILE_MIME_TYPES,
  DOWNLOAD_URL_TTL_SECONDS,
  MAX_EQUIPMENT_FILE_BYTES,
} from './equipment-file.constants';

const UPLOADER_SUMMARY = {
  uploadedBy: { select: { id: true, name: true } },
} as const;

type EquipmentFileWithUploader = EquipmentFile & {
  uploadedBy: { id: string; name: string } | null;
};

/** Lo que ve el frontend — sin storagePath ni companyId (candados internos). */
export interface EquipmentFileView {
  id: string;
  equipmentId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: string;
  description: string | null;
  uploadedBy: { id: string; name: string } | null;
  createdAt: Date;
}

export interface SignedUploadResponse {
  /** URL absoluta a la que el navegador hace PUT del archivo. */
  uploadUrl: string;
  /** Ruta del objeto — el navegador la devuelve tal cual en el registro. */
  storagePath: string;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function resolveExtension(originalName: string, contentType: string): string {
  const fromName = originalName.toLowerCase().match(/\.([a-z0-9]{1,12})$/)?.[1];
  return fromName ?? EXTENSION_BY_MIME[contentType] ?? 'bin';
}

function maxSizeLabel(): string {
  return `${Math.round(MAX_EQUIPMENT_FILE_BYTES / (1024 * 1024))} MB`;
}

function toView(file: EquipmentFileWithUploader): EquipmentFileView {
  return {
    id: file.id,
    equipmentId: file.equipmentId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    category: file.category,
    description: file.description,
    uploadedBy: file.uploadedBy,
    createdAt: file.createdAt,
  };
}

/**
 * Documentos adjuntos a un equipo (manuales, certificaciones, planos).
 *
 * La visibilidad del equipo (candado multi-tenant) la decide SIEMPRE
 * EquipmentsService.findOne — este servicio la reutiliza antes de tocar
 * EquipmentFile, nunca la reimplementa (mismo patrón que AttachmentsService
 * con WorkOrdersService.findOne).
 *
 * ORDEN DE LA SUBIDA (resuelve el límite de ~4.5 MB de las funciones de
 * Vercel — un manual pesa mucho más):
 *   1. requestUpload  → firma una URL de subida de un solo uso.
 *   2. el NAVEGADOR sube el archivo DIRECTO a Supabase (no pasa por acá).
 *   3. register       → verifica el objeto contra Supabase (existe, tamaño
 *      y tipo REALES) y recién ahí crea la fila.
 * Si el paso 3 no llega, queda un objeto huérfano en Storage (tolerable);
 * nunca una fila sin archivo.
 *
 * TODO — RESPALDO: scripts/backup.ts hace pg_dump de la base, no del bucket
 * de Supabase. Si el proyecto de Supabase se pierde, estas filas quedan
 * apuntando a archivos que ya no existen — y una certificación puede ser
 * irreemplazable. Cubrir Storage en la estrategia de respaldo está
 * pendiente (ver la nota en backup.ts y en el modelo EquipmentFile).
 *
 * TODO — LIMPIEZA DE HUÉRFANOS: una subida que firma la URL y sube el
 * archivo pero nunca llama a register deja un objeto sin fila. En
 * almacenamiento gratuito (1 GB, ver equipment-file.constants.ts) esos
 * huérfanos se acumulan en silencio y consumen la cuota. Falta un barrido
 * periódico —estilo scripts/purge-idempotency-keys.ts— que liste el bucket
 * y borre los objetos sin EquipmentFile con más de N horas. No se
 * construye ahora; retomar cuando la cuota empiece a apretar.
 *
 * TODO — "LLEVAR ESTE ARCHIVO CONMIGO": el técnico que más necesita el
 * manual es el que está en un cuarto de máquinas sin señal, y hoy no puede
 * abrirlo (no hay soporte offline para estos archivos, a propósito). El
 * paso siguiente natural es una descarga explícita al dispositivo desde la
 * ficha del equipo, con la conexión que sí tiene antes de entrar. Es una
 * decisión aparte, no parte de esta entrega.
 */
@Injectable()
export class EquipmentFilesService {
  private readonly logger = new Logger(EquipmentFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly equipmentsService: EquipmentsService,
    private readonly storage: SupabaseStorageService,
  ) {}

  /** Paso 1: firma la URL de subida. `dto` es lo DECLARADO por el cliente —
   *  solo para rechazar rápido; la verdad se comprueba en register(). */
  async requestUpload(
    user: AuthenticatedUser,
    equipmentId: string,
    dto: RequestUploadDto,
  ): Promise<SignedUploadResponse> {
    await this.equipmentsService.findOne(user.companyId, equipmentId); // candado + 404

    if (dto.sizeBytes > MAX_EQUIPMENT_FILE_BYTES) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido (${maxSizeLabel()}).`,
      );
    }

    const extension = resolveExtension(dto.originalName, dto.contentType);
    const path = `${user.companyId}/${equipmentId}/${randomUUID()}.${extension}`;

    const target = await this.storage.createSignedUploadUrl(path);
    return { uploadUrl: target.uploadUrl, storagePath: target.path };
  }

  /** Paso 3: el archivo ya está en Supabase — verificar y registrar. */
  async register(
    user: AuthenticatedUser,
    equipmentId: string,
    dto: RegisterEquipmentFileDto,
  ): Promise<EquipmentFileView> {
    await this.equipmentsService.findOne(user.companyId, equipmentId); // candado + 404

    // La ruta tiene que caer bajo el prefijo de ESTA empresa y ESTE equipo:
    // aunque la firmó el backend, el cliente podría mandar otra apuntando a
    // un objeto ajeno del mismo bucket.
    const expectedPrefix = `${user.companyId}/${equipmentId}/`;
    if (
      !dto.storagePath.startsWith(expectedPrefix) ||
      dto.storagePath.includes('..')
    ) {
      throw new BadRequestException(
        'La ruta del archivo no corresponde a este equipo',
      );
    }

    const info = await this.storage.getObjectInfo(dto.storagePath);
    if (!info) {
      throw new BadRequestException(
        'El archivo no se encuentra en el almacenamiento. Vuelve a subirlo.',
      );
    }

    // Verificación AUTORITATIVA: se cree lo que dice Supabase, no el
    // navegador — mismo criterio que congelar unitCost/unitPrice.
    const mimeType = info.contentType.split(';')[0].trim().toLowerCase();
    const allowed: readonly string[] = ALLOWED_EQUIPMENT_FILE_MIME_TYPES;

    if (
      info.sizeBytes > MAX_EQUIPMENT_FILE_BYTES ||
      !allowed.includes(mimeType)
    ) {
      // El objeto ya subido no cumple: se borra (best-effort) para no dejar
      // un huérfano que además incumple, y no se crea la fila.
      await this.storage.remove(dto.storagePath);
      throw new BadRequestException(
        info.sizeBytes > MAX_EQUIPMENT_FILE_BYTES
          ? `El archivo supera el tamaño máximo permitido (${maxSizeLabel()}).`
          : 'Tipo de archivo no permitido: solo se admiten PDF o imágenes.',
      );
    }

    const created = await this.prisma.equipmentFile.create({
      data: {
        equipmentId,
        companyId: user.companyId, // candado
        uploadedById: user.userId,
        originalName: dto.originalName.trim(),
        mimeType,
        sizeBytes: info.sizeBytes,
        category: dto.category,
        description: dto.description?.trim() || null,
        storagePath: dto.storagePath,
      },
      include: UPLOADER_SUMMARY,
    });

    return toView(created);
  }

  async list(
    user: AuthenticatedUser,
    equipmentId: string,
  ): Promise<EquipmentFileView[]> {
    await this.equipmentsService.findOne(user.companyId, equipmentId); // candado + 404

    const files = await this.prisma.equipmentFile.findMany({
      where: { equipmentId, companyId: user.companyId }, // candado
      orderBy: { createdAt: 'desc' },
      include: UPLOADER_SUMMARY,
    });

    return files.map(toView);
  }

  /**
   * Devuelve una URL de descarga firmada de vigencia corta. SIN sesión
   * válida y de la misma empresa nunca se llega acá (guard JWT + el candado
   * de EquipmentsService.findOne); el bucket es privado, así que la URL
   * canónica del objeto no sirve sin esta firma.
   */
  async getDownloadUrl(
    user: AuthenticatedUser,
    equipmentId: string,
    fileId: string,
  ): Promise<string> {
    await this.equipmentsService.findOne(user.companyId, equipmentId); // candado + 404

    const file = await this.prisma.equipmentFile.findFirst({
      where: { id: fileId, equipmentId, companyId: user.companyId }, // candado
    });
    if (!file) {
      throw new NotFoundException(
        `Archivo ${fileId} no encontrado en este equipo`,
      );
    }

    return this.storage.createSignedDownloadUrl(
      file.storagePath,
      DOWNLOAD_URL_TTL_SECONDS,
      file.originalName,
    );
  }

  /** Borrado duro. Solo ADMIN (RBAC en el controller). No se recupera. */
  async remove(
    user: AuthenticatedUser,
    equipmentId: string,
    fileId: string,
  ): Promise<EquipmentFileView> {
    await this.equipmentsService.findOne(user.companyId, equipmentId); // candado + 404

    const file = await this.prisma.equipmentFile.findFirst({
      where: { id: fileId, equipmentId, companyId: user.companyId }, // candado
      include: UPLOADER_SUMMARY,
    });
    if (!file) {
      throw new NotFoundException(
        `Archivo ${fileId} no encontrado en este equipo`,
      );
    }

    // La fila primero: si Supabase falla después, el peor caso es un objeto
    // huérfano (invisible), nunca una fila apuntando a un objeto ya borrado.
    // Supabase se llama fuera de cualquier transacción (llamada de red).
    await this.prisma.equipmentFile.delete({ where: { id: file.id } });
    await this.storage.remove(file.storagePath);

    return toView(file);
  }
}
