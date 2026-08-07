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

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Alta SaaS: crea la Company (tenant) y su primer usuario ADMIN
   * en una transacción atómica — o se crean ambos, o ninguno.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: dto.companyName.trim() },
      });

      return tx.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password: passwordHash,
          role: Role.ADMIN,
          companyId: company.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          companyId: true,
        },
      });
    });

    return this.buildAuthResponse(user);
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
