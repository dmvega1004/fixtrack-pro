import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';
import { AuthUserCache } from '../auth-user-cache';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: AuthUserCache,
  ) {
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
   *
   * La fila pasa por AuthUserCache (30 s): el detalle de una orden hace 11
   * llamadas en paralelo y cada una re-leía la misma fila. La revocación
   * sigue siendo inmediata porque todo método que cambia o borra un usuario
   * invalida su entrada — SOLO mientras haya UNA instancia del backend
   * (ver el supuesto en auth-user-cache.ts y DEPLOY.md). Un usuario que
   * no existe nunca se cachea: cada intento vuelve a la BD y recibe 401.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const cached = this.cache.get(payload.sub);
    if (cached) return cached;

    const generation = this.cache.generation(payload.sub);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        mustChangePassword: true,
        documentNumber: true,
        signatureImageUrl: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Sesión inválida: usuario no encontrado');
    }

    const authenticated: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      mustChangePassword: user.mustChangePassword,
      documentNumber: user.documentNumber,
      signatureImageUrl: user.signatureImageUrl,
    };
    this.cache.set(payload.sub, authenticated, generation);
    return authenticated;
  }
}
