import { PartialType } from '@nestjs/mapped-types';
import { OrderStatus } from 'database';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateWorkOrderDto } from './create-work-order.dto';
import { WorkOrderItemInputDto } from './work-order-item.dto';

/**
 * Campos de creación (opcionales) + status para avanzar el ciclo de vida:
 * PENDING → IN_PROGRESS → COMPLETED → DELIVERED (o CANCELLED), más los
 * montos de valorización (mano de obra, cargos adicionales, descuento).
 * No viven en CreateWorkOrderDto: una orden nace sin valorizar, se
 * valoriza más adelante desde la pestaña «Valores».
 *
 * Nota RBAC (aplicado en el service):
 * - TECHNICIAN solo puede enviar `status`, `description`, `diagnosis` y
 *   `observations`.
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
   * Conceptos de valorización (desglose del cobro, ver WorkOrderItem):
   * reemplazo completo del set actual, mismo patrón que equipmentIds y
   * QuoteItem.items — un array vacío es válido y explícito (deja la orden
   * sin conceptos); `undefined` no toca nada. Solo ADMIN (RBAC en el
   * service), mismo criterio que laborAmount/additionalAmount/discountAmount.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderItemInputDto)
  items?: WorkOrderItemInputDto[];

  /**
   * Corrección puntual de la fecha de facturación de una orden YA
   * facturada (billedAt no nulo) — ej. para cargar trabajos históricos con
   * su antigüedad real, o si se completó tarde en el sistema pero el
   * servicio real se facturó otro día. Solo ADMIN (RBAC en el service), no
   * puede ser futura (validado en el service) y debe enviarse sola (sin
   * combinar con otros campos).
   */
  @IsOptional()
  @IsDateString(
    {},
    { message: 'billedAt debe ser una fecha válida (ISO 8601)' },
  )
  billedAt?: string;

  /**
   * Costos internos (pestaña «Valores», bloque "Costos internos"): lo que
   * el trabajo costó por fuera del inventario (torno, subcontratos,
   * consumibles). NUNCA se factura al cliente. Mismo patrón que billedAt:
   * solo ADMIN (RBAC en el service), se envían solos (sin combinar con
   * otros campos) y funcionan incluso con la orden en estado terminal —
   * la factura del proveedor suele llegar días después de entregado el
   * trabajo.
   */
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'directCostAmount debe ser un número con máximo 2 decimales' },
  )
  @Min(0)
  directCostAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  directCostDescription?: string;

  /**
   * Retenciones aplicadas a la orden (bloque "Retenciones", pestaña
   * Valores): reemplazo completo del set actual, mismo patrón que
   * equipmentIds/items — un array vacío es válido y explícito (deja la
   * orden sin retenciones), `undefined` no toca nada. SOLO ADMIN (RBAC en
   * el service), ni siquiera COORDINATOR — mismo criterio estricto que
   * directCostAmount.
   */
  @IsOptional()
  @IsArray()
  @ArrayUnique({ message: 'retentionIds no puede tener retenciones repetidas' })
  @IsUUID('4', {
    each: true,
    message: 'Cada retentionId debe ser un UUID válido',
  })
  retentionIds?: string[];
}
