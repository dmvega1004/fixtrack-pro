import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

/**
 * Extrae el usuario autenticado del request (inyectado por JwtStrategy).
 *
 * Uso:
 *   findAll(@CurrentUser() user: AuthenticatedUser)          → objeto completo
 *   findAll(@CurrentUser('companyId') companyId: string)     → solo el candado tenant
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();

    return data ? request.user[data] : request.user;
  },
);
