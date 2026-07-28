import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Attachment } from 'database';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../cloudinary/image-upload.constants';
import { AttachmentsService } from './attachments.service';

/**
 * Pestaña «Fotos» de la orden. Sin @Roles: los tres roles operan, pero la
 * visibilidad de la orden la impone WorkOrdersService.findOne (el técnico
 * solo alcanza SUS órdenes) y el candado multi-tenant aplica en cada
 * consulta — igual que en WorkOrderPartsController.
 *
 * multer en memoria (memoryStorage): el archivo nunca toca disco, vive
 * como Buffer en RAM el tiempo justo para reenviarlo a Cloudinary.
 */
@Controller('work-orders/:orderId/photos')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  /** POST /work-orders/:orderId/photos — sube una foto a Cloudinary */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  addPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Attachment> {
    return this.attachmentsService.addPhoto(user, orderId, file);
  }

  /** GET /work-orders/:orderId/photos — lista las fotos de la orden */
  @Get()
  listPhotos(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<Attachment[]> {
    return this.attachmentsService.listPhotos(user, orderId);
  }

  /** DELETE /work-orders/:orderId/photos/:photoId — borra en Cloudinary y BD */
  @Delete(':photoId')
  removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<Attachment> {
    return this.attachmentsService.removePhoto(user, orderId, photoId);
  }
}
