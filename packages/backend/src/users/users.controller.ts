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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from 'database';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { MAX_IMAGE_SIZE_BYTES } from '../cloudinary/image-upload.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MyProfile, PublicUser, UsersService } from './users.service';

/**
 * Módulo 12 — Gestión de usuarios, roles y permisos.
 * Gestión (crear/editar/eliminar): SOLO ADMIN.
 * Lectura: ADMIN y COORDINATOR — el coordinador necesita el listado
 * de técnicos para asignar órdenes de trabajo (Módulo 7).
 * Los técnicos no ven la nómina (403).
 *
 * Las rutas /me van ANTES que ':id': Nest resuelve rutas del mismo
 * método/patrón en orden de registro, así que si ':id' quedara primero,
 * "me" se interpretaría como un id (mismo problema que RetentionsController
 * con "reorder").
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me — Perfil → "Mi firma". Los TRES roles (sin @Roles):
   * el administrador y el coordinador también firman órdenes.
   */
  @Get('me')
  findMe(@CurrentUser() user: AuthenticatedUser): Promise<MyProfile> {
    return this.usersService.findMe(user);
  }

  /** PATCH /users/me — los tres roles editan SU PROPIO documentNumber. */
  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<MyProfile> {
    return this.usersService.updateMe(user, dto);
  }

  /** POST /users/me/signature — los tres roles, multipart, solo PNG. */
  @Post('me/signature')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    }),
  )
  updateMySignature(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<MyProfile> {
    return this.usersService.updateMySignature(user, file);
  }

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
