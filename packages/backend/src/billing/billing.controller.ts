import { Controller, Get } from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  BilledOrdersResult,
  BillingService,
  BillingSummary,
  ClientBalanceView,
  CollectedPaymentsResult,
  ReceivableView,
  ReceivablesListResult,
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

  /** GET /billing/billed-orders — detalle de la tarjeta "Facturado del mes" */
  @Get('billed-orders')
  getBilledOrders(
    @CurrentUser('companyId') companyId: string,
  ): Promise<BilledOrdersResult> {
    return this.billingService.getBilledOrders(companyId);
  }

  /** GET /billing/collected-payments — detalle de la tarjeta "Cobrado del mes" */
  @Get('collected-payments')
  getCollectedPayments(
    @CurrentUser('companyId') companyId: string,
  ): Promise<CollectedPaymentsResult> {
    return this.billingService.getCollectedPayments(companyId);
  }

  /** GET /billing/receivables-detail — detalle de la tarjeta "Por cobrar" */
  @Get('receivables-detail')
  getReceivablesDetail(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReceivablesListResult> {
    return this.billingService.getReceivablesDetail(companyId);
  }

  /** GET /billing/receivables-overdue — detalle de la tarjeta "Vencido" */
  @Get('receivables-overdue')
  getOverdueReceivables(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReceivablesListResult> {
    return this.billingService.getOverdueReceivables(companyId);
  }
}
