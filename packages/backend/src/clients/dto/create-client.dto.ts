import {
  IsBoolean,
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

/**
 * De qué campo de la orden se alimenta cada una de las 3 secciones del
 * formato de informe propio del cliente. Mismo criterio que DOCUMENT_TYPES:
 * String? en el schema, validado solo acá.
 */
export const REPORT_FORMAT_SOURCES = [
  'DESCRIPTION',
  'DIAGNOSIS',
  'OBSERVATIONS',
  'SUGGESTIONS',
  'EMPTY',
] as const;

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  /** Días de crédito acordados con el cliente (ej. 30 = "pago a 30 días"). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365, { message: 'paymentTermDays no puede superar 365' })
  paymentTermDays?: number;

  // --- Formato de informe propio del cliente ---
  // reportFormatLogoUrl NO vive acá: se sube por POST /clients/:id/report-format-logo
  // (mismo patrón que Company.logoUrl vía POST /company/logo), nunca por este DTO.
  // "reportFormatTitle es obligatorio si reportFormatEnabled=true" se valida en
  // el service (necesita el estado EFECTIVO tras el merge con lo ya guardado,
  // no solo lo que trae este PATCH parcial — mismo criterio que otras reglas
  // de negocio de este proyecto, ej. billedAt en WorkOrdersService).

  @IsOptional()
  @IsBoolean({ message: 'reportFormatEnabled debe ser verdadero o falso' })
  reportFormatEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  reportFormatTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  reportFormatCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reportFormatVersion?: string;

  /** Texto libre — es la fecha de la VERSIÓN del formato impreso, no una fecha operativa. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  reportFormatDate?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message:
      'reportFormatAccentColor debe ser un color hexadecimal válido (ej. #2563EB)',
  })
  reportFormatAccentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reportFormatFooter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  reportFormatIssuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reportFormatS1Label?: string;

  @IsOptional()
  @IsIn(REPORT_FORMAT_SOURCES, {
    message:
      'reportFormatS1Source debe ser DESCRIPTION, DIAGNOSIS, OBSERVATIONS, SUGGESTIONS o EMPTY',
  })
  reportFormatS1Source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reportFormatS2Label?: string;

  @IsOptional()
  @IsIn(REPORT_FORMAT_SOURCES, {
    message:
      'reportFormatS2Source debe ser DESCRIPTION, DIAGNOSIS, OBSERVATIONS, SUGGESTIONS o EMPTY',
  })
  reportFormatS2Source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reportFormatS3Label?: string;

  @IsOptional()
  @IsIn(REPORT_FORMAT_SOURCES, {
    message:
      'reportFormatS3Source debe ser DESCRIPTION, DIAGNOSIS, OBSERVATIONS, SUGGESTIONS o EMPTY',
  })
  reportFormatS3Source?: string;

  @IsOptional()
  @IsBoolean({
    message: 'reportFormatIncludePhotos debe ser verdadero o falso',
  })
  reportFormatIncludePhotos?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reportFormatPhotosLabel?: string;
}
