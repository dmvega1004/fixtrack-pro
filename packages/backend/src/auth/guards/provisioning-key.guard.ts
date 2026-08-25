import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const PROVISIONING_KEY_HEADER = 'x-provisioning-key';

/**
 * Mensaje ÚNICO para toda causa de rechazo (variable no configurada,
 * cabecera ausente, clave incorrecta): la respuesta nunca debe permitir
 * distinguir un caso de otro.
 */
const GENERIC_DENIAL_MESSAGE = 'No autorizado';

/**
 * Protege POST /auth/register: exige la cabecera `x-provisioning-key` con
 * el valor de la variable de entorno PROVISIONING_KEY — la clave la
 * conoce solo el operador de la plataforma. Antes de este candado
 * cualquiera que descubriera la URL podía crear empresas en la base de
 * producción; con clientes de terceros conviviendo en la misma base, eso
 * deja de ser tolerable.
 *
 * FALLA CERRADA: si PROVISIONING_KEY no está definida (o queda vacía), el
 * endpoint responde 403 SIEMPRE, sin importar qué cabecera se envíe. Una
 * variable ausente nunca se interpreta como "no hay que verificar nada" —
 * ese es el error que convierte un despliegue mal configurado en un
 * endpoint abierto sin que nadie se entere.
 */
@Injectable()
export class ProvisioningKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[PROVISIONING_KEY_HEADER];
    const expected = process.env.PROVISIONING_KEY;

    if (
      !expected ||
      typeof provided !== 'string' ||
      provided.length === 0 ||
      !this.safeCompare(provided, expected)
    ) {
      throw new ForbiddenException(GENERIC_DENIAL_MESSAGE);
    }

    return true;
  }

  /**
   * Comparación de tiempo constante. `timingSafeEqual` exige buffers de
   * igual longitud (lanza si no), así que la longitud se compara primero
   * — esa única fuga (si la clave recibida tiene la misma longitud que la
   * esperada o no) es inevitable con esta API y no alcanza para
   * reconstruir la clave; lo que sí evita es la fuga carácter por
   * carácter que permitiría adivinarla por temporización con `===`.
   */
  private safeCompare(provided: string, expected: string): boolean {
    const providedBuffer = Buffer.from(provided);
    const expectedBuffer = Buffer.from(expected);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }
}
