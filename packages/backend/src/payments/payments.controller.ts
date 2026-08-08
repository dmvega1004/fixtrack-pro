import { Controller, Delete, Param, ParseUUIDPipe } from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PaymentsService, PaymentView } from './payments.service';

/** Módulo de Cobros: SOLO ADMIN, ni siquiera Coordinador. */
@Roles(Role.ADMIN)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /** DELETE /payments/:id — elimina un abono y recalcula el estado de pago de la orden */
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentView> {
    return this.paymentsService.remove(user, id);
  }
}
