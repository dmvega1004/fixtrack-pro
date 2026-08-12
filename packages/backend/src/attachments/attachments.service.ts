import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ActivityAction, Attachment, OrderStatus } from 'database';
import { activityAuthorName } from '../activity/activity-labels';
import { ActivityService } from '../activity/activity.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { PrismaService } from '../prisma.service';
import { WorkOrdersService } from '../work-orders/work-orders.service';

/** Tamaño máximo del lado más largo: evita almacenar fotos de 12MB de una vez. */
const MAX_PHOTO_DIMENSION = 1600;

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

/**
 * Fotos adjuntas a una orden de trabajo (evidencia del servicio).
 * La visibilidad de la orden (multi-tenant + "el técnico solo ve SUS
 * órdenes") la decide siempre WorkOrdersService.findOne — este servicio
 * nunca reimplementa esa regla, solo la reutiliza antes de tocar Attachment.
 */
@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly cloudinary: CloudinaryService,
    private readonly activityService: ActivityService,
  ) {}

  async addPhoto(
    user: AuthenticatedUser,
    workOrderId: string,
    file: Express.Multer.File | undefined,
  ): Promise<Attachment> {
    const order = await this.workOrdersService.findOne(user, workOrderId);
    this.ensureNotTerminal(order.status);
    validateImageFile(file);

    let uploaded;
    try {
      uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: `fixtrack/${user.companyId}/orders/${workOrderId}`,
        maxDimension: MAX_PHOTO_DIMENSION,
      });
    } catch (error) {
      // El detalle real (ej. credenciales de Cloudinary inválidas) queda en
      // los logs del servidor — al usuario no le sirve verlo y podría
      // filtrar configuración interna. Acá siempre se loguea para que el
      // fallo no quede invisible detrás de un 500 genérico.
      this.logger.error(
        `Fallo al subir foto a Cloudinary (orden ${workOrderId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo subir la foto a nuestro proveedor de imágenes. ' +
          'Intenta de nuevo en unos minutos; si el problema persiste, contacta al administrador.',
      );
    }

    // Cloudinary ya terminó (llamada de red, puede tardar segundos) ANTES de
    // abrir esta transacción — mantenerla abierta ese tiempo bloquearía una
    // conexión del pool. La escritura en BD y su log de bitácora sí viajan
    // juntos, para que uno nunca quede sin el otro.
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.attachment.create({
        data: {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          workOrderId,
          companyId: user.companyId, // candado
          uploadedById: user.userId,
        },
      });

      // No se guarda la URL: cambia y no aporta nada legible en la bitácora.
      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.PHOTO_ADDED,
          newValue: 'Fotografía agregada',
          isFinancial: false,
        },
        tx,
      );

      return attachment;
    });
  }

  async listPhotos(
    user: AuthenticatedUser,
    workOrderId: string,
  ): Promise<Attachment[]> {
    // Visibilidad + candado (404 si la orden es ajena o de otro técnico)
    await this.workOrdersService.findOne(user, workOrderId);

    return this.prisma.attachment.findMany({
      where: { workOrderId, companyId: user.companyId }, // candado
      orderBy: { createdAt: 'desc' },
    });
  }

  async removePhoto(
    user: AuthenticatedUser,
    workOrderId: string,
    photoId: string,
  ): Promise<Attachment> {
    const order = await this.workOrdersService.findOne(user, workOrderId);
    this.ensureNotTerminal(order.status);

    const attachment = await this.prisma.attachment.findFirst({
      where: { id: photoId, workOrderId, companyId: user.companyId }, // candado
    });

    if (!attachment) {
      throw new NotFoundException(
        `Foto ${photoId} no encontrada en esta orden`,
      );
    }

    // Se borra primero en BD: si Cloudinary falla después, el peor caso es
    // un archivo remoto huérfano (invisible), nunca una miniatura rota en
    // la galería apuntando a un adjunto que ya no existe. El borrado y su
    // log de bitácora viajan en la misma transacción; Cloudinary se llama
    // DESPUÉS, ya fuera de ella (llamada de red, no debe mantener una
    // conexión del pool abierta).
    const deleted = await this.prisma.$transaction(async (tx) => {
      const removed = await tx.attachment.delete({
        where: { id: attachment.id },
      });

      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.PHOTO_REMOVED,
          oldValue: 'Fotografía eliminada',
          isFinancial: false,
        },
        tx,
      );

      return removed;
    });

    await this.cloudinary.destroy(attachment.publicId);

    return deleted;
  }

  private ensureNotTerminal(status: OrderStatus): void {
    if (TERMINAL_STATUSES.includes(status)) {
      throw new ConflictException(
        `La orden está en estado terminal (${status}) y no admite cambios en sus fotos`,
      );
    }
  }
}
