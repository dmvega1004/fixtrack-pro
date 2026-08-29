import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Client, Role } from 'database';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../cloudinary/image-upload.constants';
import { ClientListItem, ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

/**
 * Sin @Public(): TODAS las rutas exigen JWT (guard global).
 * El companyId NUNCA viene del body ni de la URL: siempre se extrae
 * del token firmado vía @CurrentUser('companyId') — infalsificable.
 */
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * POST /clients — cualquier rol autenticado (los técnicos crean clientes
   * en campo); el service rechaza con 403 si un TECHNICIAN envía campos del
   * formato de informe propio (reportFormat*) — ver ensureCanConfigureReportFormat.
   */
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClientDto,
  ): Promise<Client> {
    return this.clientsService.create(user, dto);
  }

  /** GET /clients — lista solo los clientes de la empresa del token */
  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ClientListItem[]> {
    return this.clientsService.findAll(companyId);
  }

  /** GET /clients/:id — 404 si el cliente es de otra empresa */
  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Client> {
    return this.clientsService.findOne(companyId, id);
  }

  /**
   * PATCH /clients/:id — actualización parcial; el service rechaza con 403
   * si un TECHNICIAN envía campos del formato de informe propio.
   */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<Client> {
    return this.clientsService.update(user, id, dto);
  }

  /** DELETE /clients/:id — SOLO Administradores (RBAC) */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Client> {
    return this.clientsService.remove(companyId, id);
  }

  /**
   * POST /clients/:id/report-format-logo — SOLO ADMIN/COORDINATOR, multipart.
   * Logo del formato de informe propio de ESTE cliente (mismo patrón que
   * POST /company/logo).
   */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Post(':id/report-format-logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  uploadReportFormatLogo(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Client> {
    return this.clientsService.updateReportFormatLogo(companyId, id, file);
  }
}
