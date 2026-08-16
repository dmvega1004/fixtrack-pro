import { QuoteStatus } from 'database';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * POST /quotes/:id/decide — SOLO desde SENT. El service rechaza cualquier
 * `status` que no sea ACCEPTED o REJECTED (DRAFT se llega por creación,
 * SENT por POST /quotes/:id/send: nunca por acá).
 */
export class DecideQuoteDto {
  @IsEnum(QuoteStatus, { message: 'status debe ser ACCEPTED o REJECTED' })
  status: QuoteStatus;

  /** Obligatorio cuando status=REJECTED (validado en el service, no acá:
   * la obligatoriedad depende del valor de otro campo del mismo body). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
