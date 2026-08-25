import { Role } from 'database';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsAccountPassword } from '../../common/decorators/is-account-password.decorator';

/**
 * Invitación de empleados (Módulo 12): solo el ADMIN crea usuarios
 * de su propia empresa. El hash bcrypt se genera en el servicio.
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(120)
  name: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsAccountPassword()
  password: string;

  @IsEnum(Role, { message: 'role debe ser ADMIN, COORDINATOR o TECHNICIAN' })
  role: Role;
}
