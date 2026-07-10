import { Priority } from 'database';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Solo ADMIN y COORDINATOR crean órdenes (RBAC en el controller).
 * El status NO se envía al crear: toda orden nace PENDING.
 */
export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'La descripción del problema es obligatoria' })
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  diagnosis?: string;

  /** Equipo a intervenir. Se verifica que pertenezca a la empresa del token. */
  @IsUUID('4', { message: 'equipmentId debe ser un UUID válido' })
  equipmentId: string;

  /** Técnico asignado (opcional al crear). Debe pertenecer a la empresa. */
  @IsOptional()
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  userId?: string;

  /** Opcional: si no se envía, Prisma aplica el default MEDIUM. */
  @IsOptional()
  @IsEnum(Priority, { message: 'priority debe ser LOW, MEDIUM o HIGH' })
  priority?: Priority;
}
