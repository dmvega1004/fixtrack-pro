import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Equipment, Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivateMaintenanceBatchDto } from './dto/activate-maintenance-batch.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { UpdateEquipmentDto } from './dto/update-equipment.dto';
import {
  EquipmentsService,
  EquipmentView,
  MaintenanceDueItem,
} from './equipments.service';

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

  /** GET /equipments[?clientId=] — solo los equipos de la empresa del token */
  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('clientId', new ParseUUIDPipe({ optional: true })) clientId?: string,
  ): Promise<EquipmentView[]> {
    return this.equipmentsService.findAll(companyId, clientId);
  }

  /** GET /equipments/qr/:qrCode — resolución del escáner QR (Módulo 3) */
  @Get('qr/:qrCode')
  findByQrCode(
    @CurrentUser('companyId') companyId: string,
    @Param('qrCode', ParseUUIDPipe) qrCode: string,
  ): Promise<Equipment> {
    return this.equipmentsService.findByQrCode(companyId, qrCode);
  }

  /**
   * GET /equipments/maintenance-due — equipos con plan activo por vencer o
   * ya vencidos (ver EquipmentsService.findMaintenanceDue). Antes de
   * ':id' en el orden de rutas: si no, Nest intentaría resolver
   * "maintenance-due" como un :id y fallaría el ParseUUIDPipe.
   */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Get('maintenance-due')
  findMaintenanceDue(
    @CurrentUser('companyId') companyId: string,
  ): Promise<MaintenanceDueItem[]> {
    return this.equipmentsService.findMaintenanceDue(companyId);
  }

  /** GET /equipments/:id — 404 si el equipo es de otra empresa */
  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Equipment> {
    return this.equipmentsService.findOne(companyId, id);
  }

  /**
   * PATCH /equipments/:id — actualización parcial. El rol viaja al service
   * porque el plan de mantenimiento (maintenanceEnabled/IntervalMonths/
   * lastMaintenanceAt) es SOLO ADMIN/COORDINATOR — el resto de campos
   * sigue abierto a cualquier rol autenticado, como antes.
   */
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('role') role: Role,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<Equipment> {
    return this.equipmentsService.update(companyId, role, id, dto);
  }

  /**
   * POST /equipments/maintenance/activate-batch — activa el plan para
   * varios equipos de un mismo cliente en una sola operación transaccional
   * (ver EquipmentsService.activateMaintenanceBatch). Mismo RBAC que
   * configurar el plan individual: ADMIN/COORDINATOR.
   */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Post('maintenance/activate-batch')
  activateMaintenanceBatch(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: ActivateMaintenanceBatchDto,
  ): Promise<{ updated: number }> {
    return this.equipmentsService.activateMaintenanceBatch(companyId, dto);
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
