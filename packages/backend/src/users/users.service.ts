import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, Role, User } from 'database';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import {
  cloudinaryRootFolder,
  CloudinaryService,
} from '../cloudinary/cloudinary.service';
import { validateImageFile } from '../cloudinary/validate-image-file';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_SALT_ROUNDS = 12;

/** Lado máximo de la firma: suficiente para verse nítida impresa a ~40mm de ancho, sin guardar un escaneo gigante. */
const MAX_SIGNATURE_DIMENSION = 1000;

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
 * Proyección de "mi perfil" (GET/PATCH /users/me) — a diferencia de
 * PublicUser (lo que ADMIN/COORDINATOR ven de OTROS usuarios), sí incluye
 * documentNumber/signatureImageUrl: son datos que cada quien gestiona de
 * sí mismo, no algo que exponer en el listado de nómina.
 */
const MY_PROFILE_SELECT = {
  ...PUBLIC_USER_SELECT,
  documentNumber: true,
  signatureImageUrl: true,
} as const;

export type MyProfile = Pick<
  User,
  | 'id'
  | 'name'
  | 'email'
  | 'role'
  | 'companyId'
  | 'createdAt'
  | 'updatedAt'
  | 'documentNumber'
  | 'signatureImageUrl'
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
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** GET /users/me — los tres roles: su propio perfil, incluida su firma. */
  findMe(user: AuthenticatedUser): Promise<MyProfile> {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: MY_PROFILE_SELECT,
    });
  }

  /** PATCH /users/me — los tres roles: hoy solo documentNumber (ver UpdateMyProfileDto). */
  updateMe(
    user: AuthenticatedUser,
    dto: UpdateMyProfileDto,
  ): Promise<MyProfile> {
    return this.prisma.user.update({
      where: { id: user.userId },
      data: { documentNumber: dto.documentNumber?.trim() },
      select: MY_PROFILE_SELECT,
    });
  }

  /**
   * POST /users/me/signature — sube la rúbrica a Cloudinary y actualiza
   * User.signatureImageUrl. Mismo patrón que CompanyService.updateSignature
   * (borrado best-effort de la anterior); solo PNG, igual que la firma de
   * empresa — la firma manuscrita necesita fondo transparente real.
   */
  async updateMySignature(
    user: AuthenticatedUser,
    file: Express.Multer.File | undefined,
  ): Promise<MyProfile> {
    validateImageFile(file, ['image/png']);

    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { signatureImageUrl: true },
    });

    let uploaded;
    try {
      uploaded = await this.cloudinary.uploadBuffer(file.buffer, {
        folder: `${cloudinaryRootFolder()}/${user.companyId}/users/${user.userId}`,
        maxDimension: MAX_SIGNATURE_DIMENSION,
      });
    } catch (error) {
      this.logger.error(
        `Fallo al subir la firma de perfil a Cloudinary (usuario ${user.userId}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'No se pudo subir la firma a nuestro proveedor de imágenes. ' +
          'Intenta de nuevo en unos minutos.',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: user.userId },
      data: { signatureImageUrl: uploaded.secure_url },
      select: MY_PROFILE_SELECT,
    });

    if (current.signatureImageUrl) {
      const oldPublicId = this.cloudinary.extractPublicId(
        current.signatureImageUrl,
      );
      if (oldPublicId) {
        await this.cloudinary.destroy(oldPublicId);
      }
    }

    return updated;
  }

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
