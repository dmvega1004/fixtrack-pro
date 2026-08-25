import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Guard RBAC-adyacente global: registrado como APP_GUARD en AppModule,
 * DESPUÉS de JwtAuthGuard (necesita request.user ya poblado) y ANTES de
 * RolesGuard — un usuario que debe cambiar su contraseña no debería ni
 * siquiera llegar a un chequeo de rol.
 *
 * Bloquea con 403 CUALQUIER request de un usuario con
 * mustChangePassword=true, salvo las rutas marcadas con
 * @SkipPasswordCheck(): el propio PATCH /auth/password y GET /auth/me.
 * Sin esas dos excepciones el usuario queda encerrado sin ninguna salida
 * — solo arreglable manualmente desde la base de datos.
 */
@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isExempt = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isExempt) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    // Ruta pública (@Public) sin usuario: no aplica este candado.
    if (!user) {
      return true;
    }

    if (user.mustChangePassword) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Debes cambiar tu contraseña antes de continuar',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }

    return true;
  }
}
