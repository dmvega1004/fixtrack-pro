import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
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
  ValidateNested,
} from 'class-validator';

/** Monedas soportadas para formatear precios en el frontend. */
export const CURRENCIES = ['COP', 'USD', 'EUR', 'MXN', 'PEN'] as const;

/** Mismo patrón que create-client.dto.ts (reportFormatAccentColor). */
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

/** Debe reflejar exactamente SECTION_TITLE_STYLES en apps/web/src/lib/work-order-header-fields.ts. */
export const SECTION_TITLE_STYLES = ['UNDERLINE', 'FILLED'] as const;

/**
 * Campos opcionales del encabezado de la orden de trabajo. "Documento" y
 * "Fecha" no están acá a propósito: se pintan siempre, sin poder
 * apagarse. Debe reflejar exactamente OPTIONAL_HEADER_FIELD_KEYS en
 * apps/web/src/lib/work-order-header-fields.ts.
 */
export const OPTIONAL_HEADER_FIELD_KEYS = [
  'CLIENT',
  'TAX_ID',
  'STATUS',
  'SERVICE_TYPE',
  'PHONE',
  'EMAIL',
  'ADDRESS',
  'SERVICE_CITY',
  'SERVICE_TIME',
  'END_CLIENT',
  'TECHNICIAN',
] as const;

/**
 * Mismo vocabulario que REPORT_FORMAT_SOURCES en clients/dto/create-
 * client.dto.ts (y lib/report-format.ts en el frontend) — mismo patrón
 * de "duplicar con comentario" que HEX_COLOR_REGEX más arriba, para no
 * cruzar el límite entre los módulos company/ y clients/.
 */
export const WORK_ORDER_SECTION_SOURCES = [
  'DESCRIPTION',
  'DIAGNOSIS',
  'OBSERVATIONS',
  'SUGGESTIONS',
  'EMPTY',
] as const;

/** Máximo de secciones en letterheadWorkOrderSections — evita un documento sin fin. */
const MAX_WORK_ORDER_SECTIONS = 10;

export class WorkOrderSectionDto {
  @IsString()
  @IsNotEmpty({ message: 'El rótulo de la sección no puede quedar vacío' })
  @MaxLength(100)
  label: string;

  @IsIn(WORK_ORDER_SECTION_SOURCES, {
    message: `source debe ser uno de: ${WORK_ORDER_SECTION_SOURCES.join(', ')}`,
  })
  source: string;
}

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

  // --- Firma digital: dónde se estampa (la imagen se sube aparte, ver
  // POST /company/signature) ---

  @IsOptional()
  @IsBoolean({ message: 'signatureInCollection debe ser verdadero o falso' })
  signatureInCollection?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'signatureInQuote debe ser verdadero o falso' })
  signatureInQuote?: boolean;

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
  @IsString()
  @MaxLength(5000)
  defaultMethodology?: string;

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

  // --- Membrete de empresa ("Mi empresa"): distinto eje de
  // Client.reportFormat* (formato que exige un CLIENTE) — ver comentario
  // en schema.prisma sobre el prefijo letterhead*. ---

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message:
      'letterheadAccentColor debe ser un color hexadecimal válido (ej. #2563EB)',
  })
  letterheadAccentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  letterheadWorkOrderDocCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  letterheadWorkOrderDocVersion?: string;

  /** Texto libre — es la fecha de la VERSIÓN del documento, no una fecha operativa. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  letterheadWorkOrderDocDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  letterheadQuoteDocCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  letterheadQuoteDocVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  letterheadQuoteDocDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  letterheadCollectionDocCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  letterheadCollectionDocVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  letterheadCollectionDocDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  letterheadFooterText?: string;

  @IsOptional()
  @IsBoolean({
    message: 'letterheadShowFixtrackBranding debe ser verdadero o falso',
  })
  letterheadShowFixtrackBranding?: boolean;

  // --- Etapa 2 del membrete: estructura, no solo color ---

  @IsOptional()
  @IsIn(SECTION_TITLE_STYLES, {
    message: 'letterheadSectionTitleStyle debe ser UNDERLINE o FILLED',
  })
  letterheadSectionTitleStyle?: string;

  /**
   * Orden explícito de campos opcionales del encabezado de la orden de
   * trabajo — el arreglo SÍ conserva el orden de configuración, se pinta
   * tal cual llega. [] es un valor válido (vuelve al set de hoy), por eso
   * no lleva @IsNotEmpty.
   */
  @IsOptional()
  @IsArray({ message: 'letterheadWorkOrderHeaderFields debe ser un arreglo' })
  @ArrayUnique({
    message: 'letterheadWorkOrderHeaderFields no puede repetir un campo',
  })
  @IsIn(OPTIONAL_HEADER_FIELD_KEYS, {
    each: true,
    message: `letterheadWorkOrderHeaderFields solo admite: ${OPTIONAL_HEADER_FIELD_KEYS.join(', ')}`,
  })
  letterheadWorkOrderHeaderFields?: string[];

  /**
   * Secciones de contenido configurables de la orden de trabajo, EN EL
   * ORDEN en que se pintan — sustituye letterheadDescriptionLabel/
   * DiagnosisLabel/ObservationsLabel/SuggestionsLabel (retirados). []
   * es un valor válido (vuelve al bloque original de siempre), por eso
   * no lleva @IsNotEmpty ni @ArrayMinSize.
   */
  @IsOptional()
  @IsArray({ message: 'letterheadWorkOrderSections debe ser un arreglo' })
  @ArrayMaxSize(MAX_WORK_ORDER_SECTIONS, {
    message: `letterheadWorkOrderSections admite máximo ${MAX_WORK_ORDER_SECTIONS} secciones`,
  })
  @ValidateNested({ each: true })
  @Type(() => WorkOrderSectionDto)
  letterheadWorkOrderSections?: WorkOrderSectionDto[];
}
