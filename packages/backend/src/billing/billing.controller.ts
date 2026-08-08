import { Controller, Get } from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  BillingService,
  BillingSummary,
  ClientBalanceView,
  ReceivableView,
} from './billing.service';

/** Módulo de Cobros: SOLO ADMIN, ni siquiera Coordinador. */
@Roles(Role.ADMIN)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /** GET /billing/summary — indicadores del mes y de la cartera + últimos pagos */
  @Get('summary')
  getSummary(
    @CurrentUser('companyId') companyId: string,
  ): Promise<BillingSummary> {
    return this.billingService.getSummary(companyId);
  }

  /** GET /billing/receivables — órdenes cerradas con saldo pendiente, más antigua primero */
  @Get('receivables')
  getReceivables(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReceivableView[]> {
    return this.billingService.getReceivables(companyId);
  }

  /** GET /billing/by-client — saldo agregado por cliente, de mayor a menor */
  @Get('by-client')
  getByClient(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ClientBalanceView[]> {
    return this.billingService.getByClient(companyId);
  }
}
