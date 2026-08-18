import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * No se modela como enum de BD (SparePart.category es String con default
 * en el schema) para no requerir una migración si aparece otra categoría
 * — mismo patrón que Client.documentType.
 */
export const SPARE_PART_CATEGORIES = [
  'REPUESTO',
  'EQUIPO',
  'MATERIAL',
  'CONSUMIBLE',
] as const;

export class CreateSparePartDto {
  /** Identificador de inventario, único por empresa. Se normaliza a MAYÚSCULAS. */
  @IsString()
  @IsNotEmpty({ message: 'El SKU es obligatorio' })
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'El SKU solo admite letras, números, puntos, guiones y guiones bajos',
  })
  sku: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del repuesto es obligatorio' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(SPARE_PART_CATEGORIES, {
    message: 'category debe ser REPUESTO, EQUIPO, MATERIAL o CONSUMIBLE',
  })
  category?: string;

  @IsInt()
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;

  /** Nivel mínimo de seguridad: por debajo dispara la alerta de reabastecimiento. */
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  /**
   * false = artículo que se pide contra pedido y no se mantiene en bodega:
   * no entra en alertas de existencias y su stock no se mueve al usarlo en
   * una orden. Default true (comportamiento actual).
   */
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  /** Costo para la empresa (dato financiero: visible solo para ADMIN). */
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'cost debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  cost: number;

  /** Precio de venta al cliente. */
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'salePrice debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  salePrice: number;
}
