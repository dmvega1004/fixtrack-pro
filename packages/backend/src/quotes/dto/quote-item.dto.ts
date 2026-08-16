import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * Una línea de cotización — SIEMPRE texto libre. sparePartId es puramente
 * opcional: el frontend lo usa solo para prellenar description/unitPrice
 * desde el inventario ("Traer del inventario"); el service NO valida que
 * el repuesto exista ni descuenta stock — una cotización nunca mueve
 * inventario, y la fila sigue siendo válida aunque el repuesto se borre
 * después (ver onDelete: SetNull en el schema).
 */
export class QuoteItemInputDto {
  @IsString()
  @IsNotEmpty({ message: 'La descripción del ítem es obligatoria' })
  @MaxLength(500)
  description: string;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'quantity debe ser un número con máximo 2 decimales' },
  )
  @Min(0.01, { message: 'quantity debe ser mayor que 0' })
  quantity: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'unitPrice debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsUUID('4', { message: 'sparePartId debe ser un UUID válido' })
  sparePartId?: string;
}
