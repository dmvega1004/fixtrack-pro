import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Alta SaaS: crea una nueva empresa (tenant) junto con su primer
 * usuario Administrador. Los empleados NO se registran por aquí:
 * serán invitados por el Admin (Módulo 12).
 */
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa es obligatorio' })
  @MaxLength(120)
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del usuario es obligatorio' })
  @MaxLength(120)
  name: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72) // bcrypt trunca a 72 bytes: rechazamos lo que no puede hashear completo
  password: string;
}
