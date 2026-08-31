import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * No se modela como enum de BD (Retention.base es String) por el mismo
 * motivo que Client.documentType/SparePart.category: agregar una base
 * nueva (ej. reteIVA a secas cuando alguien la necesite) no debe requerir
 * una migración.
 */
export const RETENTION_BASES = ['SUBTOTAL', 'IVA', 'RETENTION'] as const;

export class CreateRetentionDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la retención es obligatorio' })
  @MaxLength(80)
  name: string;

  /**
   * Admite 3 decimales (ej. 0.900 para ReteICA) — @db.Decimal(6,3) en el
   * schema. 0-100: un porcentaje mayor no tiene sentido de negocio.
   */
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'rate debe ser un número con máximo 3 decimales' },
  )
  @Min(0)
  @Max(100)
  rate: number;

  @IsIn(RETENTION_BASES, {
    message: 'base debe ser SUBTOTAL, IVA o RETENTION',
  })
  base: string;

  /**
   * Obligatorio si base=RETENTION (validado en el service, que conoce el
   * estado efectivo tras el merge en update); ignorado en cualquier otro
   * caso.
   */
  @IsOptional()
  @IsUUID('4', { message: 'baseRetentionId debe ser un UUID válido' })
  baseRetentionId?: string;
}
