import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como pública (sin JWT).
 * Con el JwtAuthGuard global, TODO está protegido por defecto;
 * solo lo marcado con @Public() queda accesible sin token.
 */
export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
