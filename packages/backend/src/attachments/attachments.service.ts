import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Attachment, OrderStatus } from 'database';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async addPhoto(
    user: AuthenticatedUser,
    workOrderId: string,
    file: Express.Multer.File | undefined,
  ): Promise<Attachment> {
    const order = await this.workOrdersService.findOne(user, workOrderId);
    this.ensureNotTerminal(order.status);
    validateImageFile(file);

    const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
      folder: `fixtrack/${user.companyId}/orders/${workOrderId}`,
      maxDimension: MAX_PHOTO_DIMENSION,
    });

    return this.prisma.attachment.create({
      data: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        workOrderId,
        companyId: user.companyId, // candado
        uploadedById: user.userId,
      },
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
    // la galería apuntando a un adjunto que ya no existe.
    const deleted = await this.prisma.attachment.delete({
      where: { id: attachment.id },
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
