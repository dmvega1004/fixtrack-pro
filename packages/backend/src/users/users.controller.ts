import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from 'database';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublicUser, UsersService } from './users.service';

/**
 * Módulo 12 — Gestión de usuarios, roles y permisos.
 * Gestión (crear/editar/eliminar): SOLO ADMIN.
 * Lectura: ADMIN y COORDINATOR — el coordinador necesita el listado
 * de técnicos para asignar órdenes de trabajo (Módulo 7).
 * Los técnicos no ven la nómina (403).
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** POST /users — SOLO ADMIN: invita empleados (hash bcrypt automático) */
  @Roles(Role.ADMIN)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.create(user, dto);
  }

  /** GET /users[?role=TECHNICIAN] — ADMIN y COORDINATOR */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('role', new ParseEnumPipe(Role, { optional: true }))
    role?: Role,
  ): Promise<PublicUser[]> {
    return this.usersService.findAll(user, role);
  }

  /** GET /users/:id — ADMIN y COORDINATOR */
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicUser> {
    return this.usersService.findOne(user, id);
  }

  /** PATCH /users/:id — SOLO ADMIN: nombre, rol o reset de contraseña */
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUser> {
    return this.usersService.update(user, id, dto);
  }

  /** DELETE /users/:id — SOLO ADMIN, con protecciones anti-lockout */
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicUser> {
    return this.usersService.remove(user, id);
  }
}
