import { PartialType } from '@nestjs/mapped-types';
import { OrderStatus } from 'database';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateWorkOrderDto } from './create-work-order.dto';

/**
 * Campos de creación (opcionales) + status para avanzar el ciclo de vida:
 * PENDING → IN_PROGRESS → COMPLETED → DELIVERED (o CANCELLED).
 *
 * Nota RBAC (aplicado en el service): un TECHNICIAN solo puede enviar
 * `status` y `diagnosis`; cualquier otro campo le devuelve 403.
 */
export class UpdateWorkOrderDto extends PartialType(CreateWorkOrderDto) {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message:
      'status debe ser PENDING, IN_PROGRESS, COMPLETED, DELIVERED o CANCELLED',
  })
  status?: OrderStatus;
}
