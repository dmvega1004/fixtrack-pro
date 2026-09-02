import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const IDEMPOTENCY_OPERATION_KEY = 'idempotencyOperation';

/**
 * Marca un endpoint de escritura como protegido por llave de idempotencia
 * (cabecera Idempotency-Key). Sin la cabecera, el endpoint se comporta
 * exactamente igual que sin este decorador — ver IdempotencyInterceptor.
 *
 * `operation` es un identificador libre y estable para ESTE endpoint (ej.
 * "payments.create") — se guarda junto a cada llave para poder rechazar
 * una llave reutilizada por error con una operación distinta (ver
 * IdempotencyInterceptor.acquireOrGetCached). No es un enum a propósito:
 * sumar esto a un endpoint nuevo es agregar una línea, nunca una
 * migración.
 *
 * Ejemplo: @Idempotent('payments.create')
 */
export function Idempotent(
  operation: string,
): ClassDecorator & MethodDecorator {
  return applyDecorators(
    SetMetadata(IDEMPOTENCY_OPERATION_KEY, operation),
    UseInterceptors(IdempotencyInterceptor),
  );
}
