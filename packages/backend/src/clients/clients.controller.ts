import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Client, Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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

  /** POST /clients — cualquier rol autenticado (los técnicos crean clientes en campo) */
  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateClientDto,
  ): Promise<Client> {
    return this.clientsService.create(companyId, dto);
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

  /** PATCH /clients/:id — actualización parcial */
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<Client> {
    return this.clientsService.update(companyId, id, dto);
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
}
