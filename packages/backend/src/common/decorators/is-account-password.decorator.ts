import { applyDecorators } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Regla mínima de contraseña de cuenta: mínimo 8 caracteres, máximo 72
 * (bcrypt trunca a 72 bytes — lo que no puede hashear completo se
 * rechaza acá, no en silencio). Fuente única para todo DTO que reciba
 * una contraseña NUEVA (alta de empleado, cambio de la propia
 * contraseña) — cambiarla acá la cambia en todos a la vez.
 */
export function IsAccountPassword(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    MaxLength(72),
  );
}
