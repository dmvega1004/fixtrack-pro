import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../cloudinary/image-upload.constants';
import { WorkOrderView } from '../work-orders/work-orders.service';
import { SaveWorkOrderSignaturesDto } from './dto/save-work-order-signatures.dto';
import {
  SignatureUploadResult,
  WorkOrderSignaturesService,
} from './work-order-signatures.service';

/**
 * Bloque "Firmas" (pestaña Detalles). Sin @Roles: los tres roles operan
 * sobre las órdenes que cada uno puede ver — la visibilidad la impone
 * WorkOrdersService.findOne, igual criterio que AttachmentsController con
 * las fotos.
 */
@Controller('work-orders/:orderId/signatures')
export class WorkOrderSignaturesController {
  constructor(
    private readonly signaturesService: WorkOrderSignaturesService,
  ) {}

  /** POST /work-orders/:orderId/signatures/upload — sube una rúbrica, devuelve su URL. */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<SignatureUploadResult> {
    return this.signaturesService.uploadSignatureImage(user, orderId, file);
  }

  /** PATCH /work-orders/:orderId/signatures — congela el bloque (registra signedAt + bitácora). */
  @Patch()
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: SaveWorkOrderSignaturesDto,
  ): Promise<WorkOrderView> {
    return this.signaturesService.save(user, orderId, dto);
  }
}
