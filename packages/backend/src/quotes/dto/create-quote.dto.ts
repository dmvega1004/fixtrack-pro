import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuoteItemInputDto } from './quote-item.dto';

/**
 * Nace SIEMPRE en DRAFT (status no se envía acá — ver QuotesService.send
 * para la transición a SENT). Las condiciones comerciales que se omitan se
 * copian de Company.default* en el service; lo que sí venga acá tiene
 * prioridad.
 */
export class CreateQuoteDto {
  @IsUUID('4', { message: 'clientId debe ser un UUID válido' })
  clientId: string;

  @IsString()
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  siteName?: string;

  @IsString()
  @IsNotEmpty({ message: 'El alcance es obligatorio' })
  @MaxLength(5000)
  scope: string;

  /**
   * Equipos involucrados (opcional, varios) del mismo cliente — mismo
   * patrón que CreateWorkOrderDto.equipmentIds. Duplicados se rechazan acá.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique({ message: 'equipmentIds no puede tener equipos repetidos' })
  @IsUUID('4', { each: true, message: 'Cada equipmentId debe ser un UUID válido' })
  equipmentIds?: string[];

  /**
   * Ítems de la cotización, en el orden en que se muestran (position se
   * asigna en el service según el índice del array). Array vacío válido:
   * una cotización puede empezar sin ítems y completarse después.
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemInputDto)
  items: QuoteItemInputDto[];

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'discountAmount debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  warrantyTerms?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  exclusions?: string;

  /** Si se omite, el service aplica Company.defaultValidityDays. */
  @IsOptional()
  @IsInt({ message: 'validityDays debe ser un entero' })
  @Min(1)
  @Max(365)
  validityDays?: number;
}
