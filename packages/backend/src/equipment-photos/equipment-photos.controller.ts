import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from 'database';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../cloudinary/image-upload.constants';
import { UseOrderPhotoDto } from './dto/use-order-photo.dto';
import {
  CoverResult,
  EquipmentPhotosService,
  EquipmentPhotoView,
} from './equipment-photos.service';

/**
 * Galería de fotos del equipo. Subir y marcar portada: los TRES roles —el
 * técnico es el único que está frente al equipo—. Borrar: solo ADMIN y
 * COORDINATOR, porque una foto borrada por error en campo no se recupera.
 *
 * multer en memoria, igual que AttachmentsController: el archivo vive como
 * Buffer el tiempo justo para reenviarlo a Cloudinary.
 */
@Controller('equipments/:equipmentId/photos')
export class EquipmentPhotosController {
  constructor(private readonly photosService: EquipmentPhotosService) {}

  /** POST /equipments/:equipmentId/photos — sube una foto a Cloudinary */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<EquipmentPhotoView> {
    return this.photosService.add(user, equipmentId, file);
  }

  /**
   * POST /equipments/:equipmentId/photos/from-order-photo — copia una foto
   * de una orden en la que está este equipo y la deja como portada. Los tres
   * roles (mismo criterio que subir y marcar portada).
   */
  @Post('from-order-photo')
  useOrderPhotoAsCover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Body() dto: UseOrderPhotoDto,
  ): Promise<EquipmentPhotoView> {
    return this.photosService.useOrderPhotoAsCover(
      user,
      equipmentId,
      dto.attachmentId,
    );
  }

  /** GET /equipments/:equipmentId/photos — más reciente primero, con isCover */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
  ): Promise<EquipmentPhotoView[]> {
    return this.photosService.list(user, equipmentId);
  }

  /** PATCH /equipments/:equipmentId/photos/:photoId/cover — la marca como portada */
  @Patch(':photoId/cover')
  setCover(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<CoverResult> {
    return this.photosService.setCover(user, equipmentId, photoId);
  }

  /** DELETE /equipments/:equipmentId/photos/:photoId — devuelve la portada resultante */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Delete(':photoId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<CoverResult> {
    return this.photosService.remove(user, equipmentId, photoId);
  }
}
