import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ActivityAction, OrderStatus } from 'database';
import {
  ACTIVITY_ROLE_LABELS,
  activityAuthorName,
} from '../activity/activity-labels';
import { ActivityService } from '../activity/activity.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  cloudinaryRootFolder,
  CloudinaryService,
} from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { PrismaService } from '../prisma.service';
import { WorkOrdersService, WorkOrderView } from '../work-orders/work-orders.service';
import { SaveWorkOrderSignaturesDto } from './dto/save-work-order-signatures.dto';

/** Lado máximo de la firma: igual criterio que la firma de perfil/empresa — nítida a ~40mm impresos, sin guardar un escaneo gigante. */
const MAX_SIGNATURE_DIMENSION = 1000;

/** Una orden entregada o cancelada queda sellada — mismo criterio que el resto de la orden. */
const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export interface SignatureUploadResult {
  url: string;
}

/**
 * Bloque "Firmas" (pestaña Detalles, Módulo de Firmas): SIN @Roles en el
 * controller — los tres roles capturan, sobre las órdenes que cada uno
 * puede ver (WorkOrdersService.findOne aplica esa visibilidad, igual que
 * AttachmentsService con las fotos). No es un módulo financiero, así que
 * no hereda ninguno de los candados RBAC de WorkOrdersService.update().
 */
@Injectable()
export class WorkOrderSignaturesService {
  private readonly logger = new Logger(WorkOrderSignaturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workOrdersService: WorkOrdersService,
    private readonly cloudinary: CloudinaryService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * POST /work-orders/:orderId/signatures/upload — sube UNA rúbrica
   * (dibujada ad-hoc para esta orden, o la del receptor, que nunca tiene
   * perfil) y devuelve su URL. NO escribe nada en WorkOrder todavía — eso
   * lo hace save(), cuando el usuario pulsa "Guardar firmas" con los dos
   * lados listos. Si nunca se llama a save(), el archivo queda huérfano en
   * Cloudinary (aceptable: es una firma de unos KB, no una foto).
   */
  async uploadSignatureImage(
    user: AuthenticatedUser,
    orderId: string,
    file: Express.Multer.File | undefined,
  ): Promise<SignatureUploadResult> {
    const order = await this.workOrdersService.findOne(user, orderId); // visibilidad + candado
    this.ensureNotTerminal(order.status);
    validateImageFile(file, ['image/png']);

    try {
      const uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: `${cloudinaryRootFolder()}/${user.companyId}/orders/${orderId}/signatures`,
        maxDimension: MAX_SIGNATURE_DIMENSION,
      });
      return { url: uploaded.secure_url };
    } catch (error) {
      this.logger.error(
        `Fallo al subir firma a Cloudinary (orden ${orderId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo subir la firma a nuestro proveedor de imágenes. ' +
          'Intenta de nuevo en unos minutos.',
      );
    }
  }

  /**
   * PATCH /work-orders/:orderId/signatures — congela el bloque de firmas.
   * technicianName/technicianDocument/technicianRole SIEMPRE se copian del
   * PERFIL y el rol del usuario autenticado en ESTE momento (nunca del
   * dto): es la persona que está firmando ahora mismo como técnico, no
   * necesariamente WorkOrder.userId — el enunciado es explícito en que
   * ADMIN/COORDINATOR también ejecutan y firman trabajo.
   */
  async save(
    user: AuthenticatedUser,
    orderId: string,
    dto: SaveWorkOrderSignaturesDto,
  ): Promise<WorkOrderView> {
    const order = await this.workOrdersService.findOne(user, orderId); // visibilidad + candado
    this.ensureNotTerminal(order.status);

    const actor = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { documentNumber: true },
    });

    const capturedTechnician = dto.technicianSignatureUrl !== undefined;
    const capturedReceiver =
      dto.receiverName !== undefined ||
      dto.receiverDocument !== undefined ||
      dto.receiverSignatureUrl !== undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id: orderId },
        data: {
          ...(capturedTechnician && {
            technicianSignatureUrl: dto.technicianSignatureUrl,
            technicianName: activityAuthorName(user),
            technicianDocument: actor.documentNumber,
            technicianRole: ACTIVITY_ROLE_LABELS[user.role],
          }),
          ...(dto.receiverName !== undefined && {
            receiverName: dto.receiverName.trim(),
          }),
          ...(dto.receiverDocument !== undefined && {
            receiverDocument: dto.receiverDocument.trim(),
          }),
          ...(dto.receiverRole !== undefined && {
            receiverRole: dto.receiverRole.trim(),
          }),
          ...(dto.receiverCompany !== undefined && {
            receiverCompany: dto.receiverCompany.trim(),
          }),
          ...(dto.receiverSignatureUrl !== undefined && {
            receiverSignatureUrl: dto.receiverSignatureUrl,
          }),
          signedAt: new Date(),
        },
      });

      // No es un evento financiero: el técnico lo ve en su propia bitácora.
      await this.activityService.record(
        {
          companyId: user.companyId,
          workOrderId: orderId,
          userId: user.userId,
          userName: activityAuthorName(user),
          action: ActivityAction.SIGNATURES_CAPTURED,
          newValue: [
            capturedTechnician ? 'firma del técnico' : null,
            capturedReceiver ? 'firma de quien recibe' : null,
          ]
            .filter(Boolean)
            .join(' y '),
          isFinancial: false,
        },
        tx,
      );
    });

    // Vuelve a leer a través de WorkOrdersService.findOne, que ya aplica la
    // redacción RBAC correcta según el rol (toView() es privado ahí) —
    // más simple y seguro que reconstruir la vista a mano acá.
    return this.workOrdersService.findOne(user, orderId);
  }

  private ensureNotTerminal(status: OrderStatus): void {
    if (TERMINAL_STATUSES.includes(status)) {
      throw new ConflictException(
        `La orden está en estado terminal (${status}): las firmas quedan selladas y no se pueden modificar`,
      );
    }
  }
}
