import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Monedas soportadas para formatear precios en el frontend. */
export const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'PEN'] as const;

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la empresa no puede quedar vacío' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  slogan?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[+\d\s().-]{7,25}$/, {
    message: 'El teléfono solo admite dígitos, espacios y + ( ) . -',
  })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsUrl({}, { message: 'El sitio web debe ser una URL válida' })
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsIn(CURRENCIES, { message: 'currency debe ser COP, USD, EUR, MXN o PEN' })
  currency?: string;

  /** Porcentaje de IVA del tenant (ej. 19.00). 0 si no es responsable de IVA. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'taxRate debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  @Max(100, { message: 'taxRate no puede superar 100' })
  taxRate?: number;
}
