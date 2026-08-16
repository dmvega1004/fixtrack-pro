import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, Matches } from 'class-validator';
import { DATE_ONLY_PATTERN } from '../../common/date-only.util';
import { CreateQuoteDto } from './create-quote.dto';

/**
 * PATCH /quotes/:id. Todos los campos de CreateQuoteDto, pero opcionales —
 * SOLO aplican mientras la cotización sigue en DRAFT (validado en el
 * service): una vez SENT, ni ítems ni valores ni condiciones se pueden
 * tocar por acá — para eso existe duplicar (POST /quotes/:id/duplicate).
 *
 * `followUpAt` es la única excepción: viaja en este mismo DTO porque es lo
 * único editable DESPUÉS de enviar (junto al estado, que tiene su propio
 * endpoint — POST /quotes/:id/decide). El service exige que, si la
 * cotización ya no está en DRAFT, el body traiga followUpAt y NADA más.
 */
export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {
  /** "YYYY-MM-DD", sin hora. */
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN, {
    message: 'followUpAt debe tener el formato YYYY-MM-DD',
  })
  followUpAt?: string;
}
