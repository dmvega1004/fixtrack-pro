import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateSparePartDto } from './dto/create-spare-part.dto';
import { UpdateSparePartDto } from './dto/update-spare-part.dto';
import { SparePartsService, SparePartView } from './spare-parts.service';

/**
 * Catálogo de inventario. Gestión (crear/editar/borrar): solo ADMIN,
 * porque implica datos financieros (cost). Lectura: todos los roles,
 * con `cost` omitido para no-administradores (redacción en el service).
 */
@Controller('spare-parts')
export class SparePartsController {
  constructor(private readonly sparePartsService: SparePartsService) {}

  /** POST /spare-parts — SOLO ADMIN (define costos y precios) */
  @Roles(Role.ADMIN)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSparePartDto,
  ): Promise<SparePartView> {
    return this.sparePartsService.create(user, dto);
  }

  /** GET /spare-parts[?lowStock=true] — catálogo; lowStock = alerta de reabastecimiento */
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lowStock', new ParseBoolPipe({ optional: true }))
    lowStock?: boolean,
  ): Promise<SparePartView[]> {
    return this.sparePartsService.findAll(user, lowStock);
  }

  /** GET /spare-parts/:id */
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SparePartView> {
    return this.sparePartsService.findOne(user, id);
  }

  /** PATCH /spare-parts/:id — SOLO ADMIN */
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSparePartDto,
  ): Promise<SparePartView> {
    return this.sparePartsService.update(user, id, dto);
  }

  /** DELETE /spare-parts/:id — SOLO ADMIN; 409 si aparece en órdenes */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SparePartView> {
    return this.sparePartsService.remove(user, id);
  }
}
