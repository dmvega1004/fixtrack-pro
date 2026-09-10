import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { RegisterEquipmentFileDto } from './dto/register-equipment-file.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import {
  EquipmentFilesService,
  EquipmentFileView,
  SignedUploadResponse,
} from './equipment-files.service';

/**
 * Documentos adjuntos a un equipo. Sin @Roles en subir/listar/descargar:
 * los tres roles operan (el TÉCNICO en sitio encuentra el manual pegado al
 * tablero y lo sube). BORRAR es solo ADMIN — un archivo borrado no se
 * recupera. La visibilidad del equipo la impone EquipmentsService.findOne
 * dentro del servicio, y el candado multi-tenant aplica en cada consulta.
 *
 * Prefijo compartido con EquipmentsController — mismo caso que
 * AttachmentsController bajo work-orders/:orderId/photos.
 */
@Controller('equipments/:equipmentId/files')
export class EquipmentFilesController {
  constructor(private readonly filesService: EquipmentFilesService) {}

  /** POST /equipments/:equipmentId/files/signature — paso 1: firma la subida */
  @Post('signature')
  requestUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Body() dto: RequestUploadDto,
  ): Promise<SignedUploadResponse> {
    return this.filesService.requestUpload(user, equipmentId, dto);
  }

  /** POST /equipments/:equipmentId/files — paso 3: verifica en Supabase y registra */
  @Post()
  register(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Body() dto: RegisterEquipmentFileDto,
  ): Promise<EquipmentFileView> {
    return this.filesService.register(user, equipmentId, dto);
  }

  /** GET /equipments/:equipmentId/files — lista los archivos del equipo */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
  ): Promise<EquipmentFileView[]> {
    return this.filesService.list(user, equipmentId);
  }

  /**
   * GET /equipments/:equipmentId/files/:fileId/download — devuelve una URL
   * de Supabase firmada y de vigencia corta (5 min). El proxy de Next la
   * convierte en un 302 hacia Supabase; el archivo nunca pasa por nuestros
   * servidores. Sin sesión válida de la misma empresa no se llega acá; el
   * bucket es privado, así que la URL sin firmar no sirve.
   */
  @Get(':fileId/download')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<{ url: string }> {
    const url = await this.filesService.getDownloadUrl(
      user,
      equipmentId,
      fileId,
    );
    return { url };
  }

  /** DELETE /equipments/:equipmentId/files/:fileId — SOLO Administradores */
  @Roles(Role.ADMIN)
  @Delete(':fileId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('equipmentId', ParseUUIDPipe) equipmentId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<EquipmentFileView> {
    return this.filesService.remove(user, equipmentId, fileId);
  }
}
