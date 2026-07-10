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
import { Equipment, Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import { EquipmentsService } from './equipments.service';

/**
 * Sin @Public(): todas las rutas exigen JWT (guard global).
 * El companyId siempre proviene del token vía @CurrentUser('companyId').
 */
@Controller('equipments')
export class EquipmentsController {
  constructor(private readonly equipmentsService: EquipmentsService) {}

  /** POST /equipments — los técnicos registran equipos en campo */
  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateEquipmentDto,
  ): Promise<Equipment> {
    return this.equipmentsService.create(companyId, dto);
  }

  /** GET /equipments — solo los equipos de la empresa del token */
  @Get()
  findAll(@CurrentUser('companyId') companyId: string): Promise<Equipment[]> {
    return this.equipmentsService.findAll(companyId);
  }

  /** GET /equipments/qr/:qrCode — resolución del escáner QR (Módulo 3) */
  @Get('qr/:qrCode')
  findByQrCode(
    @CurrentUser('companyId') companyId: string,
    @Param('qrCode', ParseUUIDPipe) qrCode: string,
  ): Promise<Equipment> {
    return this.equipmentsService.findByQrCode(companyId, qrCode);
  }

  /** GET /equipments/:id — 404 si el equipo es de otra empresa */
  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Equipment> {
    return this.equipmentsService.findOne(companyId, id);
  }

  /** PATCH /equipments/:id — actualización parcial */
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    return this.equipmentsService.update(companyId, id, dto);
  }

  /** DELETE /equipments/:id — SOLO Administradores (RBAC) */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Equipment> {
    return this.equipmentsService.remove(companyId, id);
  }
}
