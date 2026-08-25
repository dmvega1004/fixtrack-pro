import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from 'database';
import { PrismaService } from '../prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AuthenticatedUser,
  JwtPayload,
} from './interfaces/jwt-payload.interface';

/** Costo del hash: 12 rondas ≈ 250ms por hash, resistente a fuerza bruta. */
const BCRYPT_SALT_ROUNDS = 12;

/** Datos públicos del usuario: NUNCA exponer el hash de la contraseña. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
}

/**
 * POST /auth/register YA NO devuelve token de sesión (ver ProvisioningKeyGuard):
 * quien da de alta una empresa es el operador de la plataforma, no el
 * administrador de esa empresa — no hay razón para que el alta quede con
 * una sesión abierta dentro de los datos del cliente. Solo los datos del
 * alta en sí.
 */
export interface RegisterCompanyResponse {
  company: {
    id: string;
    name: string;
  };
  admin: {
    name: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Alta SaaS: crea la Company (tenant) y su primer usuario ADMIN
   * en una transacción atómica — o se crean ambos, o ninguno.
   *
   * Llamado solo por el operador de la plataforma (ProvisioningKeyGuard
   * en el controller exige la cabecera x-provisioning-key) — nunca
   * devuelve un token de sesión: quien da de alta la empresa no es su
   * administrador, y no tiene por qué quedar con una sesión abierta
   * dentro de los datos del cliente.
   */
  async register(dto: RegisterDto): Promise<RegisterCompanyResponse> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const { company, admin } = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.companyName.trim() },
      });

      const admin = await tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password: passwordHash,
          role: Role.ADMIN,
          companyId: company.id,
          // La contraseña la definió el operador de la plataforma, no el
          // Admin de la empresa — debe cambiarla antes de poder usar el
          // sistema (ver MustChangePasswordGuard).
          mustChangePassword: true,
        },
        select: { name: true, email: true },
      });

      return { company, admin };
    });

    return {
      company: { id: company.id, name: company.name },
      admin: { name: admin.name, email: admin.email },
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email } });

    // Mensaje genérico deliberado: no revelar si el correo existe o no
    // (evita la enumeración de cuentas por atacantes).
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.buildAuthResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }

  /**
   * PATCH /auth/password — el usuario autenticado cambia SU PROPIA
   * contraseña. `user` viene SIEMPRE del token de sesión (nunca de un id
   * en el body/ruta — ver ChangePasswordDto y el controller): así no hay
   * forma de que esta llamada afecte la cuenta de otra persona.
   *
   * Exige la contraseña actual: es la prueba de que quien está al
   * teclado es el dueño de la cuenta, no un trámite — sin esto, una
   * sesión abierta en un computador compartido le bastaría a cualquiera
   * para dejar fuera al dueño real.
   *
   * NOTA — sesiones ya emitidas: este cambio NO invalida los JWT que ya
   * estén en circulación (otro dispositivo, otra pestaña). El sistema no
   * lleva lista de tokens revocados ni un claim de versión de contraseña
   * verificado en JwtStrategy.validate, así que una sesión abierta en
   * otro lado sigue siendo válida hasta que expire sola (JWT_EXPIRES_IN).
   * Es una decisión consciente para el alcance de este cambio, no un
   * olvido: revocación activa de sesiones es infraestructura aparte
   * (blacklist de tokens, o un contador de versión por usuario) que no
   * corresponde acá.
   */
  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
      select: { password: true },
    });

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      current.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    // dto.currentPassword YA quedó probado idéntico a la contraseña real
    // (bcrypt.compare arriba) — comparar contra dto.newPassword es
    // suficiente para detectar "la nueva es igual a la actual", sin
    // necesidad de un segundo bcrypt.compare contra el hash.
    if (dto.newPassword === dto.currentPassword) {
      throw new ConflictException(
        'La contraseña nueva debe ser distinta de la actual',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    // Único lugar donde mustChangePassword se limpia: el usuario acaba de
    // probar que conoce la contraseña asignada por un tercero Y definió
    // una propia. Si un ADMIN es quien cambia la contraseña de otro
    // (UsersService.update), la marca se ACTIVA en vez de limpiarse — ver
    // ese servicio.
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { password: passwordHash, mustChangePassword: false },
    });
  }

  private buildAuthResponse(user: PublicUser): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
