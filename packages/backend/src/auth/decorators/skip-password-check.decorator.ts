import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const SKIP_PASSWORD_CHECK_KEY = 'skipPasswordCheck';

/**
 * Exime una ruta del candado de MustChangePasswordGuard. Úsalo SOLO en
 * las rutas que un usuario con mustChangePassword=true necesita para
 * poder salir de ese estado por su cuenta: cambiar su propia contraseña
 * y GET /auth/me (el frontend lo usa para saber que debe redirigir a la
 * pantalla de cambio obligatorio). El cierre de sesión no necesita esta
 * excepción: es una operación puramente del frontend (borra la cookie),
 * nunca llama al backend.
 */
export const SkipPasswordCheck = (): CustomDecorator<string> =>
  SetMetadata(SKIP_PASSWORD_CHECK_KEY, true);
