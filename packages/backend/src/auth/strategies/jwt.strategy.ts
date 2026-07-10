import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../interfaces/jwt-payload.interface';

/** Fail-fast: si falta el secreto, el servidor no debe arrancar. */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'FATAL: La variable de entorno JWT_SECRET no está definida. ' +
        'Agrégala al archivo .env de packages/backend.',
    );
  }
  return secret;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  /**
   * Se ejecuta en cada request con token válido (firma + expiración OK).
   * Re-verificamos contra la BD que el usuario siga existiendo y leemos
   * su rol y companyId ACTUALES (no los del momento de emisión del token):
   * un usuario eliminado o degradado pierde acceso de inmediato.
   * Lo retornado se inyecta como `request.user`.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, companyId: true },
    });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida: usuario no encontrado');
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }
}
