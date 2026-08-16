import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from '../../common/date-only.util';
import { CreateEquipmentDto } from './create-equipment.dto';

/**
 * Todos los campos de CreateEquipmentDto, pero opcionales.
 * Nota: qrCode NO es editable — lo genera la base de datos y es
 * el identificador físico permanente de la etiqueta del equipo.
 *
 * Plan de mantenimiento preventivo (maintenanceEnabled/IntervalMonths/
 * lastMaintenanceAt): SOLO ADMIN y COORDINATOR pueden tocar estos tres
 * campos (RBAC aplicado en el service, no acá — depende del rol del
 * token, no de la forma del dto). El resto de reglas (obligatoriedad
 * cruzada al activar, fecha no futura, recálculo de nextMaintenanceAt)
 * también vive en el service: son reglas de NEGOCIO que dependen del
 * estado actual del equipo, no de la forma de este payload.
 */
export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {
  @IsOptional()
  @IsBoolean()
  maintenanceEnabled?: boolean;

  /** 1..60. Obligatorio (en el resultado final) cuando el plan queda activo. */
  @IsOptional()
  @IsInt({ message: 'maintenanceIntervalMonths debe ser un entero' })
  @Min(1)
  @Max(60)
  maintenanceIntervalMonths?: number;

  /**
   * Fecha del último mantenimiento — SOLO fecha, sin hora ("YYYY-MM-DD").
   * No puede ser futura (validado en el service, donde se conoce "hoy").
   */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'lastMaintenanceAt debe tener el formato YYYY-MM-DD',
  })
  lastMaintenanceAt?: string;
}
