import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService, PaymentView } from './payments.service';

/** Módulo de Cobros: SOLO ADMIN, ni siquiera Coordinador. */
@Roles(Role.ADMIN)
@Controller('work-orders/:orderId/payments')
export class WorkOrderPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** POST /work-orders/:orderId/payments — registra un abono */
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CreatePaymentDto,
  ): Promise<PaymentView> {
    return this.paymentsService.create(user, orderId, dto);
  }

  /** GET /work-orders/:orderId/payments — historial de abonos de la orden */
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PaymentView[]> {
    return this.paymentsService.listByWorkOrder(user, orderId);
  }
}
