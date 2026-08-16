import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from '../../common/date-only.util';

/**
 * POST /equipments/maintenance/activate-batch — activa el plan para varios
 * equipos de UN cliente con el mismo intervalo y la misma fecha base (ver
 * EquipmentsService.activateMaintenanceBatch). Todos obligatorios: a
 * diferencia del PATCH individual, acá no hay estado previo que rellene lo
 * que falte.
 */
export class ActivateMaintenanceBatchDto {
  @IsUUID('4', { message: 'clientId debe ser un UUID válido' })
  clientId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un equipo' })
  @ArrayUnique({ message: 'equipmentIds no puede tener equipos repetidos' })
  @IsUUID('4', { each: true, message: 'Cada equipmentId debe ser un UUID válido' })
  equipmentIds: string[];

  @IsInt({ message: 'maintenanceIntervalMonths debe ser un entero' })
  @Min(1)
  @Max(60)
  maintenanceIntervalMonths: number;

  @Matches(DATE_ONLY_PATTERN, {
    message: 'lastMaintenanceAt debe tener el formato YYYY-MM-DD',
  })
  lastMaintenanceAt: string;
}
