import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role, User } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_SALT_ROUNDS = 12;

/** Proyección pública: el hash de la contraseña JAMÁS sale del servicio. */
const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type PublicUser = Pick<
  User,
  'id' | 'name' | 'email' | 'role' | 'companyId' | 'createdAt' | 'updatedAt'
>;

/**
 * Módulo 12 — Gestión de usuarios de la empresa.
 * Reglas anti-bloqueo (lockout):
 * - Nadie puede eliminarse a sí mismo ni cambiar su propio rol.
 * - No se puede eliminar ni degradar al ÚLTIMO administrador:
 *   una empresa sin Admin quedaría huérfana de forma irreversible.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateUserDto,
  ): Promise<PublicUser> {
    const email = dto.email.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password: passwordHash,
          role: dto.role,
          companyId: user.companyId, // candado: el empleado nace en MI empresa
          // La contraseña temporal la definió el ADMIN que invita, no el
          // empleado — debe cambiarla antes de poder usar el sistema.
          mustChangePassword: true,
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      // P2002: email único global ya registrado
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una cuenta con este correo');
      }
      throw error;
    }
  }

  findAll(user: AuthenticatedUser, role?: Role): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      where: {
        companyId: user.companyId, // candado
        ...(role ? { role } : {}),
      },
      select: PUBLIC_USER_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<PublicUser> {
    const found = await this.prisma.user.findFirst({
      where: { id, companyId: user.companyId }, // candado
      select: PUBLIC_USER_SELECT,
    });

    if (!found) {
      throw new NotFoundException(`Usuario ${id} no encontrado`);
    }

    return found;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
  ): Promise<PublicUser> {
    const target = await this.findOne(user, id); // pertenencia al tenant

    const changesRole = dto.role !== undefined && dto.role !== target.role;

    // Anti-lockout 1: nadie cambia su propio rol
    if (changesRole && id === user.userId) {
      throw new ForbiddenException(
        'No puedes cambiar tu propio rol. Pídeselo a otro administrador.',
      );
    }

    // Anti-lockout 2: no degradar al último Admin de la empresa
    if (changesRole && target.role === Role.ADMIN) {
      await this.ensureNotLastAdmin(user.companyId);
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS)
      : undefined;

    // Restablecimiento por un tercero: el ADMIN (id !== user.userId) le
    // define una contraseña nueva a otro usuario, así que ese usuario
    // debe cambiarla antes de poder seguir usando el sistema — mismo
    // razonamiento que crear el usuario. NUNCA se limpia acá (solo
    // AuthService.changePassword la limpia): este es justamente el caso
    // que debe volver a activarla, aunque ya estuviera en true.
    const mustChangePassword =
      dto.password && id !== user.userId ? true : undefined;

    return this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        role: dto.role,
        password: passwordHash,
        mustChangePassword,
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  async remove(user: AuthenticatedUser, id: string): Promise<PublicUser> {
    // Anti-lockout 1: nadie se elimina a sí mismo
    if (id === user.userId) {
      throw new ForbiddenException(
        'No puedes eliminar tu propia cuenta. Pídeselo a otro administrador.',
      );
    }

    const target = await this.findOne(user, id); // pertenencia al tenant

    // Anti-lockout 2: no eliminar al último Admin
    if (target.role === Role.ADMIN) {
      await this.ensureNotLastAdmin(user.companyId);
    }

    // Las órdenes asignadas al eliminado quedan sin asignar automáticamente
    // (FK WorkOrder.userId con ON DELETE SET NULL) y su sesión muere en el
    // próximo request (la JwtStrategy re-consulta la BD).
    return this.prisma.user.delete({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
  }

  /** Bloquea la operación si solo queda un administrador en la empresa. */
  private async ensureNotLastAdmin(companyId: string): Promise<void> {
    const admins = await this.prisma.user.count({
      where: { companyId, role: Role.ADMIN }, // candado
    });

    if (admins <= 1) {
      throw new ConflictException(
        'Operación bloqueada: es el último administrador de la empresa. ' +
          'Nombra otro Admin antes de eliminar o degradar a este.',
      );
    }
  }
}
