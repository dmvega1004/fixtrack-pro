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
 * ADMIN, COORDINATOR y TECHNICIAN pueden crear órdenes (RBAC en el
 * controller). Si quien crea es TECHNICIAN, el service ignora `userId` y
 * autoasigna la orden a quien la crea.
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

  /** Notas del servicio realizado, separadas del diagnóstico inicial. */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  observations?: string;

  /**
   * Cliente dueño de la orden — vínculo principal y obligatorio. Se
   * verifica que pertenezca a la empresa del token.
   */
  @IsUUID('4', { message: 'clientId debe ser un UUID válido' })
  clientId: string;

  /**
   * Equipo a intervenir (opcional): la empresa también presta servicios
   * locativos (sellado, limpieza, instalación) sin equipo asociado. Si
   * se envía, se verifica que pertenezca a la empresa del token Y al
   * cliente indicado en `clientId`.
   */
  @IsOptional()
  @IsUUID('4', { message: 'equipmentId debe ser un UUID válido' })
  equipmentId?: string;

  /**
   * Técnico asignado (opcional al crear). Debe pertenecer a la empresa.
   * Ignorado si quien crea es un TECHNICIAN (siempre queda autoasignado).
   */
  @IsOptional()
  @IsUUID('4', { message: 'userId debe ser un UUID válido' })
  userId?: string;

  /** Opcional: si no se envía, Prisma aplica el default MEDIUM. */
  @IsOptional()
  @IsEnum(Priority, { message: 'priority debe ser LOW, MEDIUM o HIGH' })
  priority?: Priority;
}
