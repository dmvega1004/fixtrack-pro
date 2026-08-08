import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrderStatus, Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import { WorkOrdersService, WorkOrderView } from './work-orders.service';

/**
 * Este módulo recibe el @CurrentUser() COMPLETO (no solo companyId),
 * porque el RBAC fino necesita también userId y role para decidir
 * qué órdenes ve y qué campos puede tocar cada quien.
 */
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  /**
   * POST /work-orders — Admin/Coordinador crean y pueden asignar a cualquiera
   * (o dejar sin asignar). Técnico también puede crear, pero SIEMPRE queda
   * autoasignado: cualquier userId que envíe en el body se ignora (RBAC en
   * el service).
   */
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.TECHNICIAN)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkOrderDto,
  ): Promise<WorkOrderView> {
    return this.workOrdersService.create(user, dto);
  }

  /**
   * GET /work-orders[?status=PENDING] — Admin/Coordinador ven todas las
   * de su empresa; el Técnico SOLO las asignadas a él.
   */
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
  ): Promise<WorkOrderView[]> {
    return this.workOrdersService.findAll(user, status);
  }

  /** GET /work-orders/:id — 404 si es de otra empresa o de otro técnico */
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkOrderView> {
    return this.workOrdersService.findOne(user, id);
  }

  /**
   * PATCH /work-orders/:id — Admin/Coordinador: todo campo.
   * Técnico: solo status, diagnosis y observations de SUS órdenes (403 si intenta más).
   */
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ): Promise<WorkOrderView> {
    return this.workOrdersService.update(user, id, dto);
  }

  /** DELETE /work-orders/:id — SOLO Administradores (RBAC) */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkOrderView> {
    return this.workOrdersService.remove(user, id);
  }
}
