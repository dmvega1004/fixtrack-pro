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
import { Idempotent } from '../idempotency/idempotent.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService, PaymentView } from './payments.service';

/** Módulo de Cobros: SOLO ADMIN, ni siquiera Coordinador. */
@Roles(Role.ADMIN)
@Controller('work-orders/:orderId/payments')
export class WorkOrderPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /work-orders/:orderId/payments — registra un abono.
   *
   * Primer consumidor de @Idempotent (ver packages/backend/src/idempotency):
   * una sola tabla, ya transaccional (PaymentsService.create recalcula
   * WorkOrder.paymentStatus dentro de la misma transacción que crea el
   * pago), y sin I/O externo — a propósito no se eligió "subir foto"
   * (Cloudinary no es transaccional con la base de datos). Un abono
   * duplicado por un reintento de red es además el caso donde más duele:
   * dinero real contado dos veces.
   */
  @Idempotent('payments.create')
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
