import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Retention, Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRetentionDto } from './dto/create-retention.dto';
import { ReorderRetentionsDto } from './dto/reorder-retentions.dto';
import { UpdateRetentionDto } from './dto/update-retention.dto';
import { RetentionsService } from './retentions.service';

/**
 * Catálogo de retenciones de la empresa ("Mi empresa" → tarjeta
 * "Retenciones"). SOLO ADMIN — mismo criterio que PATCH /company/me: es
 * configuración financiera del tenant, ni COORDINATOR la toca.
 */
@Roles(Role.ADMIN)
@Controller('retentions')
export class RetentionsController {
  constructor(private readonly retentionsService: RetentionsService) {}

  /** GET /retentions — catálogo completo (activas e inactivas), en orden. */
  @Get()
  list(@CurrentUser('companyId') companyId: string): Promise<Retention[]> {
    return this.retentionsService.list(companyId);
  }

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateRetentionDto,
  ): Promise<Retention> {
    return this.retentionsService.create(companyId, dto);
  }

  /**
   * PATCH /retentions/reorder — ANTES de ':id' en el archivo a propósito:
   * Nest resuelve rutas del mismo método/patrón en orden de registro, así
   * que si ':id' quedara primero, "reorder" se interpretaría como un id.
   */
  @Patch('reorder')
  reorder(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: ReorderRetentionsDto,
  ): Promise<Retention[]> {
    return this.retentionsService.reorder(companyId, dto.ids);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRetentionDto,
  ): Promise<Retention> {
    return this.retentionsService.update(companyId, id, dto);
  }
}
