import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSparePartDto {
  /** Identificador de inventario, único por empresa. Se normaliza a MAYÚSCULAS. */
  @IsString()
  @IsNotEmpty({ message: 'El SKU es obligatorio' })
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message: 'El SKU solo admite letras, números, puntos, guiones y guiones bajos',
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

  @IsInt()
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock: number;

  /** Nivel mínimo de seguridad: por debajo dispara la alerta de reabastecimiento. */
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

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
