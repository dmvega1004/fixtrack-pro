import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AddWorkOrderPartDto } from './dto/add-work-order-part.dto';
import {
  WorkOrderPartsService,
  WorkOrderPartsSummary,
  WorkOrderPartView,
} from './work-order-parts.service';

/**
 * Pestaña «Repuestos» de la orden. Sin @Roles: los tres roles operan,
 * pero la visibilidad de la orden la impone WorkOrdersService.findOne
 * (el técnico solo alcanza SUS órdenes) y el candado multi-tenant
 * aplica en cada consulta. El RBAC financiero redacta unitCost/totalCost.
 */
@Controller('work-orders/:orderId/parts')
export class WorkOrderPartsController {
  constructor(private readonly workOrderPartsService: WorkOrderPartsService) {}

  /** POST /work-orders/:orderId/parts — agrega repuesto y descuenta stock */
  @Post()
  addPart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AddWorkOrderPartDto,
  ): Promise<WorkOrderPartView> {
    return this.workOrderPartsService.addPart(user, orderId, dto);
  }

  /** GET /work-orders/:orderId/parts — desglose con totales */
  @Get()
  listParts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<WorkOrderPartsSummary> {
    return this.workOrderPartsService.listParts(user, orderId);
  }

  /** DELETE /work-orders/:orderId/parts/:sparePartId — quita la línea y devuelve stock */
  @Delete(':sparePartId')
  removePart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('sparePartId', ParseUUIDPipe) sparePartId: string,
  ): Promise<WorkOrderPartView> {
    return this.workOrderPartsService.removePart(user, orderId, sparePartId);
  }
}
