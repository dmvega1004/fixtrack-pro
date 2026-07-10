import { EquipmentStatus } from 'database';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  @MaxLength(80)
  brand: string;

  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  @MaxLength(120)
  model: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNumber?: string;

  /**
   * Cliente propietario del equipo. El servicio verifica que este
   * cliente pertenezca a la empresa del token (validación cruzada
   * multi-tenant) antes de crear el equipo.
   */
  @IsUUID('4', { message: 'clientId debe ser un UUID válido' })
  clientId: string;

  /** Opcional: si no se envía, Prisma aplica el default ACTIVE. */
  @IsOptional()
  @IsEnum(EquipmentStatus, {
    message: 'status debe ser ACTIVE, IN_REPAIR o RETIRED',
  })
  status?: EquipmentStatus;
}
