import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { DecideQuoteDto } from './dto/decide-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QuotesService, QuoteStatusFilter, QuoteView } from './quotes.service';

const QUOTE_STATUS_VALUES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'] as const;

function parseStatusFilter(value?: string): QuoteStatusFilter | undefined {
  return value && (QUOTE_STATUS_VALUES as readonly string[]).includes(value)
    ? (value as QuoteStatusFilter)
    : undefined;
}

/**
 * Módulo aparte de WorkOrder a propósito: una cotización tiene ciclo,
 * numeración y destino propios (la mayoría nunca se convierte en trabajo).
 * RBAC de módulo completo: SOLO ADMIN/COORDINATOR — el TECHNICIAN no tiene
 * acceso a ningún endpoint de acá, ni de lectura.
 */
@Roles(Role.ADMIN, Role.COORDINATOR)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateQuoteDto,
  ): Promise<QuoteView> {
    return this.quotesService.create(user.companyId, user.userId, dto);
  }

  /** GET /quotes[?status=&search=&take=&skip=] */
  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('take', new ParseIntPipe({ optional: true })) take?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ): Promise<QuoteView[]> {
    return this.quotesService.findAll(companyId, {
      status: parseStatusFilter(status),
      search,
      take,
      skip,
    });
  }

  /** GET /quotes/count — mismos filtros que arriba (menos take/skip). */
  @Get('count')
  count(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ): Promise<{ count: number }> {
    return this.quotesService
      .count(companyId, { status: parseStatusFilter(status), search })
      .then((count) => ({ count }));
  }

  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteView> {
    return this.quotesService.findOne(companyId, id);
  }

  /**
   * PATCH /quotes/:id — DRAFT: cualquier campo de negocio. Enviada/decidida:
   * SOLO followUpAt (ver QuotesService.update).
   */
  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuoteDto,
  ): Promise<QuoteView> {
    return this.quotesService.update(companyId, id, dto);
  }

  /** POST /quotes/:id/send — DRAFT → SENT: asigna número y congela valores. */
  @Post(':id/send')
  send(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteView> {
    return this.quotesService.send(companyId, id);
  }

  /** POST /quotes/:id/decide — SENT → ACCEPTED/REJECTED. */
  @Post(':id/decide')
  decide(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideQuoteDto,
  ): Promise<QuoteView> {
    return this.quotesService.decide(companyId, id, dto);
  }

  /** POST /quotes/:id/duplicate — nuevo DRAFT con los mismos datos e ítems, sin número. */
  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteView> {
    return this.quotesService.duplicate(user.companyId, user.userId, id);
  }

  /** DELETE /quotes/:id — solo DRAFT, y solo ADMIN (el resto del módulo es ADMIN/COORDINATOR). */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteView> {
    return this.quotesService.remove(companyId, id);
  }
}
