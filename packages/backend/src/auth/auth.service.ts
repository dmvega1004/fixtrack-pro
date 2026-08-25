import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from 'database';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

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
