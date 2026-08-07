import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * No se modela como enum de BD (Client.documentType es String? en el schema)
 * para no requerir una migración si en el futuro aparece otro tipo de
 * documento — la validación de los valores permitidos vive solo acá.
 */
export const DOCUMENT_TYPES = ['CC', 'NIT', 'CE', 'PASAPORTE'] as const;

export class CreateClientDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del cliente es obligatorio' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  @Matches(/^[+\d\s().-]{7,25}$/, {
    message: 'El teléfono solo admite dígitos, espacios y + ( ) . -',
  })
  phone: string;

  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  @IsIn(DOCUMENT_TYPES, {
    message: 'documentType debe ser CC, NIT, CE o PASAPORTE',
  })
  documentType: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @MaxLength(30)
  documentNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  /** Días de crédito acordados con el cliente (ej. 30 = "pago a 30 días"). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365, { message: 'paymentTermDays no puede superar 365' })
  paymentTermDays?: number;
}
