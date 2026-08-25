import { IsNotEmpty, IsString } from 'class-validator';
import { IsAccountPassword } from '../../common/decorators/is-account-password.decorator';

/**
 * PATCH /auth/password — el usuario autenticado cambia SU PROPIA
 * contraseña. A propósito no lleva ningún identificador de usuario: el
 * dueño de la cuenta se toma SIEMPRE del token de sesión (ver
 * AuthController.changePassword), nunca de algo que viaje en el body.
 */
export class ChangePasswordDto {
  /**
   * Sin regla de longitud propia: lo único que importa es que coincida
   * con el hash almacenado (bcrypt.compare en el servicio) — es la
   * prueba de que quien está al teclado es el dueño de la cuenta.
   */
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  currentPassword: string;

  @IsAccountPassword()
  newPassword: string;
}
