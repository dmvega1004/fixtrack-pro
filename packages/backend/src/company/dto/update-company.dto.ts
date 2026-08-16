import {
  IsEmail,
  IsIn,
  IsInt,
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

  /** NIT (u otro documento tributario) de la empresa — para el membrete de documentos imprimibles. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

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

  // --- Documento de cobro (cuenta de cobro) ---

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'El título del documento no puede quedar vacío' })
  @MaxLength(100)
  collectionDocTitle?: string;

  /** Beneficiario del pago si difiere del nombre de la empresa. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  payeeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  payeeDocument?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  signerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  signerRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  collectionDocFootnote?: string;

  /**
   * Próximo consecutivo a asignar. Solo aplica a documentos futuros — no
   * reescribe collectionNumber de órdenes ya emitidas. El service advierte
   * (sin bloquear) si el valor queda en o por debajo de un número ya
   * emitido, para evitar duplicados.
   */
  @IsOptional()
  @IsInt({ message: 'nextCollectionNumber debe ser un entero positivo' })
  @Min(1, { message: 'nextCollectionNumber debe ser un entero positivo' })
  nextCollectionNumber?: number;

  // --- Cotizaciones (valores por defecto) ---

  /**
   * Próximo consecutivo de cotización a asignar. Igual criterio que
   * nextCollectionNumber: solo aplica a la próxima que se ENVÍE (no
   * reescribe quoteNumber de cotizaciones ya enviadas).
   */
  @IsOptional()
  @IsInt({ message: 'nextQuoteNumber debe ser un entero positivo' })
  @Min(1, { message: 'nextQuoteNumber debe ser un entero positivo' })
  nextQuoteNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultPaymentTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultDeliveryTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultWarrantyTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  defaultExclusions?: string;

  @IsOptional()
  @IsInt({ message: 'defaultValidityDays debe ser un entero' })
  @Min(1)
  @Max(365)
  defaultValidityDays?: number;

  @IsOptional()
  @IsInt({ message: 'quoteFollowUpDays debe ser un entero' })
  @Min(1)
  @Max(365)
  quoteFollowUpDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  quoteFootnote?: string;
}
