import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * Actualización de empleados: name, role y password (reset), opcionales.
 * El email queda EXCLUIDO deliberadamente: es la identidad de login
 * y cambiarla merece un flujo propio con verificación (fase posterior).
 */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email'] as const),
) {}
