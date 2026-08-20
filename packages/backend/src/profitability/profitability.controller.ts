import { Controller, Get, Query } from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ProfitabilityClientView,
  ProfitabilityMonthPoint,
  ProfitabilityOrderView,
  ProfitabilityService,
  ProfitabilitySummary,
} from './profitability.service';

/**
 * Módulo de Rentabilidad: margen bruto por orden, cliente y mes. SOLO
 * LECTURA, exclusivo ADMIN — ni siquiera Coordinador (ver preámbulo de
 * ProfitabilityService). El candado RBAC va acá, en el guard del
 * controller, no ocultando botones en el frontend.
 */
@Roles(Role.ADMIN)
@Controller('profitability')
export class ProfitabilityController {
  constructor(private readonly profitabilityService: ProfitabilityService) {}

  /** GET /profitability/summary?from=YYYY-MM-DD&to=YYYY-MM-DD — indicadores agregados del período. */
  @Get('summary')
  getSummary(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ProfitabilitySummary> {
    return this.profitabilityService.getSummary(companyId, from, to);
  }

  /** GET /profitability/orders — detalle por orden, ordenable por margen o porcentaje (sortBy=margin|marginPercent&order=asc|desc). */
  @Get('orders')
  getOrders(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ): Promise<ProfitabilityOrderView[]> {
    return this.profitabilityService.getOrders(
      companyId,
      from,
      to,
      sortBy,
      order,
    );
  }

  /** GET /profitability/by-client — margen agregado por cliente, de mayor a menor. */
  @Get('by-client')
  getByClient(
    @CurrentUser('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ProfitabilityClientView[]> {
    return this.profitabilityService.getByClient(companyId, from, to);
  }

  /** GET /profitability/monthly — serie de los últimos 12 meses calendario, para la tendencia. */
  @Get('monthly')
  getMonthly(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ProfitabilityMonthPoint[]> {
    return this.profitabilityService.getMonthly(companyId);
  }
}
