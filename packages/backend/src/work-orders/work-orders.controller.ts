import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ActivityLog,
  OrderStatus,
  PaymentStatus,
  Priority,
  Role,
} from 'database';
import { ActivityService } from '../activity/activity.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';
import {
  WorkOrderDashboardStats,
  WorkOrdersService,
  WorkOrderView,
} from './work-orders.service';

/**
 * Este módulo recibe el @CurrentUser() COMPLETO (no solo companyId),
 * porque el RBAC fino necesita también userId y role para decidir
 * qué órdenes ve y qué campos puede tocar cada quien.
 */
@Controller('work-orders')
export class WorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly activityService: ActivityService,
  ) {}

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
   * GET /work-orders[?status=&priority=&paymentStatus=&clientId=&equipmentId=&userId=&take=&skip=]
   * Admin/Coordinador ven todas las de su empresa; el Técnico SOLO las
   * asignadas a él — el filtro `userId` de query NUNCA puede ampliar eso
   * (ver el candado aplicado al final en el service, después de mezclar
   * los filtros opcionales).
   */
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
    @Query('priority', new ParseEnumPipe(Priority, { optional: true }))
    priority?: Priority,
    @Query(
      'paymentStatus',
      new ParseEnumPipe(PaymentStatus, { optional: true }),
    )
    paymentStatus?: PaymentStatus,
    @Query('clientId', new ParseUUIDPipe({ optional: true })) clientId?: string,
    @Query('equipmentId', new ParseUUIDPipe({ optional: true }))
    equipmentId?: string,
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ): Promise<WorkOrderView[]> {
    return this.workOrdersService.findAll(user, {
      status,
      priority,
      paymentStatus,
      clientId,
      equipmentId,
      userId,
      take,
      skip,
    });
  }

  /**
   * GET /work-orders/count — mismos filtros que arriba (menos take/skip),
   * para mostrar un total real mientras /ordenes pagina con "Cargar más".
   */
  @Get('count')
  count(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status', new ParseEnumPipe(OrderStatus, { optional: true }))
    status?: OrderStatus,
    @Query('priority', new ParseEnumPipe(Priority, { optional: true }))
    priority?: Priority,
    @Query(
      'paymentStatus',
      new ParseEnumPipe(PaymentStatus, { optional: true }),
    )
    paymentStatus?: PaymentStatus,
    @Query('clientId', new ParseUUIDPipe({ optional: true })) clientId?: string,
    @Query('equipmentId', new ParseUUIDPipe({ optional: true }))
    equipmentId?: string,
    @Query('userId', new ParseUUIDPipe({ optional: true })) userId?: string,
  ): Promise<{ count: number }> {
    return this.workOrdersService
      .count(user, {
        status,
        priority,
        paymentStatus,
        clientId,
        equipmentId,
        userId,
      })
      .then((count) => ({ count }));
  }

  /**
   * GET /work-orders/stats — agregados del dashboard de Admin/Coordinador
   * (conteos por estado, promedio de resolución, ranking de técnicos,
   * recientes). SOLO Admin/Coordinador: expone datos de toda la empresa
   * (ranking de TODOS los técnicos), que un Técnico no debe ver.
   */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Get('stats')
  stats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkOrderDashboardStats> {
    return this.workOrdersService.getStats(user);
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
   * GET /work-orders/:id/activity — bitácora de auditoría de la orden.
   * Reutiliza findOne para la MISMA verificación de acceso que GET
   * /work-orders/:id (candado + 404 si es de otra empresa o de otro
   * técnico). El filtro de eventos financieros para TECHNICIAN se aplica
   * en la consulta (ver ActivityService.findAllForWorkOrder).
   */
  @Get(':id/activity')
  async getActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivityLog[]> {
    await this.workOrdersService.findOne(user, id);
    return this.activityService.findAllForWorkOrder(user, id);
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

  /**
   * POST /work-orders/:id/collection-document — SOLO ADMIN. Genera (o, si
   * ya existe, devuelve) el consecutivo de la cuenta de cobro de una orden
   * cerrada. 409 si la orden sigue abierta.
   */
  @Roles(Role.ADMIN)
  @Post(':id/collection-document')
  generateCollectionDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkOrderView> {
    return this.workOrdersService.generateCollectionDocument(user, id);
  }
}
