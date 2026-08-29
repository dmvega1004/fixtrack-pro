import { Priority, ServiceType } from 'database';
import {
  ArrayUnique,
  IsArray,
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
   * Cliente FINAL del servicio, cuando se trabaja como subcontratista de
   * `clientId` (ver WorkOrder.endClientName en el schema). Opcional: en el
   * formato de informe propio del cliente contratante, vacío = línea en
   * blanco para llenar a mano.
   */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  endClientName?: string;

  /**
   * Ciudad donde se ejecutó ESTE servicio (ver WorkOrder.serviceCity en el
   * schema) — puede diferir de la ciudad registrada en la ficha del
   * cliente. Opcional: si se deja vacía, el formato de informe propio del
   * cliente usa Client.city como respaldo.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceCity?: string;

  /**
   * Recomendaciones al cliente, separadas de `observations` (notas de lo
   * que se hizo). Alimenta la sección SUGGESTIONS del formato de informe
   * propio del cliente y, si tiene contenido, un bloque propio en el
   * informe de la empresa.
   */
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  suggestions?: string;

  /**
   * Equipos a intervenir (opcional, varios): la empresa también presta
   * servicios locativos (sellado, limpieza, instalación) sin equipo
   * asociado — un array vacío u omitido es un servicio locativo. Una
   * orden puede abarcar varios equipos del mismo cliente (ej. un proyecto
   * de adecuación normativa sobre 5 portones cotizado como una sola OT).
   * Se verifica que cada equipo pertenezca a la empresa del token Y al
   * cliente indicado en `clientId`; duplicados se rechazan acá mismo.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique({ message: 'equipmentIds no puede tener equipos repetidos' })
  @IsUUID('4', {
    each: true,
    message: 'Cada equipmentId debe ser un UUID válido',
  })
  equipmentIds?: string[];

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

  /**
   * Opcional: si no se envía, Prisma aplica el default CORRECTIVE. Lo usa
   * "Programar mantenimiento" (precarga PREVENTIVE) y cualquier orden que
   * el usuario quiera marcar como inspección/instalación desde el inicio.
   */
  @IsOptional()
  @IsEnum(ServiceType, {
    message:
      'serviceType debe ser CORRECTIVE, PREVENTIVE, INSPECTION o INSTALLATION',
  })
  serviceType?: ServiceType;
}
