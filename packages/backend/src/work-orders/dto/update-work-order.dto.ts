import { PartialType } from '@nestjs/mapped-types';
import { OrderStatus } from 'database';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CreateWorkOrderDto } from './create-work-order.dto';

/**
 * Campos de creación (opcionales) + status para avanzar el ciclo de vida:
 * PENDING → IN_PROGRESS → COMPLETED → DELIVERED (o CANCELLED), más los
 * montos de valorización (mano de obra, cargos adicionales, descuento).
 * No viven en CreateWorkOrderDto: una orden nace sin valorizar, se
 * valoriza más adelante desde la pestaña «Valores».
 *
 * Nota RBAC (aplicado en el service):
 * - TECHNICIAN solo puede enviar `status`, `diagnosis` y `observations`.
 * - Los montos de valorización (laborAmount, additionalAmount,
 *   additionalDescription, discountAmount) son SOLO ADMIN — ni siquiera
 *   COORDINATOR puede tocarlos.
 * Cualquier campo no permitido devuelve 403.
 */
export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message:
      'status debe ser PENDING, IN_PROGRESS, COMPLETED, DELIVERED o CANCELLED',
  })
  status?: OrderStatus;

  /** Mano de obra cobrada en la orden. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'laborAmount debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  laborAmount?: number;

  /** Cargos adicionales (transporte u otros), con su descripción libre en additionalDescription. */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'additionalAmount debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  additionalAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  additionalDescription?: string;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'discountAmount debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  discountAmount?: number;

  /**
   * Corrección puntual de la fecha de facturación de una orden YA
   * facturada (billedAt no nulo) — ej. si se completó tarde en el sistema
   * pero el servicio real se facturó otro día. Solo ADMIN (RBAC en el
   * service), y debe enviarse sola (sin combinar con otros campos).
   */
  @IsOptional()
  @IsDateString(
    {},
    { message: 'billedAt debe ser una fecha válida (ISO 8601)' },
  )
  billedAt?: string;
}
