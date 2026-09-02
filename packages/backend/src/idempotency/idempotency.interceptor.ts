import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Prisma } from 'database';
import { Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma.service';
import { IDEMPOTENCY_OPERATION_KEY } from './idempotent.decorator';

const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Ventana durante la que una reserva sin completar bloquea reintentos con
 * la misma llave. 120s: ~4x el tiempo límite de escritura del cliente
 * (WRITE_TIMEOUT_MS = 30s en apps/web/src/lib/api/http.ts, ya pensado
 * para que una foto tarde más en subir con señal débil) — margen de sobra
 * para variación del lado del servidor (Cloudinary, arranque en frío,
 * pausas de GC) sin dejar una reserva REALMENTE abandonada (el proceso
 * murió a mitad de la operación) atascada ni remotamente cerca de los 7
 * días que dura la purga. Pasada esta ventana, la siguiente petición con
 * la misma llave la retoma y ejecuta — ver acquireOrGetCached().
 */
const RESERVATION_WINDOW_MS = 120_000;

/** Tope de reintentos al chocar con otra petición reclamando la misma reserva abandonada a la vez. */
const MAX_RECLAIM_ATTEMPTS = 3;

type IdempotencyClaim =
  | { mode: 'execute'; reservationId: string }
  | { mode: 'cached'; responseBody: Prisma.JsonValue };

/**
 * Envuelve un endpoint marcado con @Idempotent(operation): sin la
 * cabecera Idempotency-Key, deja pasar la petición sin tocar nada (mismo
 * comportamiento de siempre). Con la cabecera, usa la restricción única
 * (companyId, key) de la tabla IdempotencyKey como único árbitro de
 * concurrencia — nada de locks en memoria — para que dos peticiones
 * simultáneas con la misma llave nunca ejecuten el handler dos veces.
 *
 * Un Interceptor, no un Guard: un Guard solo decide si la petición entra,
 * no tiene forma de leer ni guardar lo que el handler devolvió. Esto
 * necesita las dos cosas: cortar ANTES de ejecutar (devolver lo guardado)
 * y engancharse DESPUÉS (guardar la respuesta, o liberar la reserva si
 * el handler falló).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, unknown>;
      user?: AuthenticatedUser;
    }>();
    const rawKey = request.headers[IDEMPOTENCY_HEADER];

    if (!rawKey || typeof rawKey !== 'string') {
      return next.handle();
    }

    const operation = this.reflector.get<string | undefined>(
      IDEMPOTENCY_OPERATION_KEY,
      context.getHandler(),
    );
    const user = request.user;

    // No debería pasar (el decorador siempre pone los dos), pero deja
    // pasar en vez de reventar una ruta protegida por un descuido.
    if (!operation || !user) {
      return next.handle();
    }

    const claim = await this.acquireOrGetCached(
      rawKey,
      user.companyId,
      user.userId,
      operation,
    );

    if (claim.mode === 'cached') {
      return of(claim.responseBody);
    }

    return next.handle().pipe(
      switchMap((responseBody) =>
        from(this.complete(claim.reservationId, context, responseBody)),
      ),
      catchError((error: unknown) =>
        from(this.release(claim.reservationId)).pipe(
          switchMap(() => {
            throw error;
          }),
        ),
      ),
    );
  }

  /**
   * Intenta reservar la llave con un INSERT — la restricción única
   * (companyId, key) de Postgres es lo único que decide quién gana bajo
   * concurrencia real, no hay ningún chequeo-y-luego-escribe del lado de
   * Node. Si el INSERT choca, decide entre: devolver lo ya guardado,
   * rechazar (dueño/operación distintos, o reserva todavía vigente), o
   * retomar una reserva abandonada.
   */
  private async acquireOrGetCached(
    key: string,
    companyId: string,
    userId: string,
    operation: string,
    attempt = 0,
  ): Promise<IdempotencyClaim> {
    try {
      const reservation = await this.prisma.idempotencyKey.create({
        data: { key, companyId, userId, operation, reservedAt: new Date() },
      });
      return { mode: 'execute', reservationId: reservation.id };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }

    const existing = await this.prisma.idempotencyKey.findUniqueOrThrow({
      where: { companyId_key: { companyId, key } },
    });

    if (existing.responseBody !== null) {
      // Capa de adentro: el aislamiento por empresa ya lo cubre la
      // restricción única (companyId, key); esto protege contra reusar
      // por error la MISMA llave con otro usuario u otra operación
      // dentro de la misma empresa — nunca se devuelve la respuesta de
      // uno para la petición de otro.
      if (existing.userId !== userId || existing.operation !== operation) {
        throw new ConflictException(
          'Esta llave de idempotencia ya se usó con otro usuario o para otra operación',
        );
      }
      return { mode: 'cached', responseBody: existing.responseBody };
    }

    const ageMs = Date.now() - existing.reservedAt.getTime();
    if (ageMs < RESERVATION_WINDOW_MS) {
      throw new ConflictException(
        'Esta operación con la misma llave ya se está procesando — intenta de nuevo en un momento',
      );
    }

    if (attempt >= MAX_RECLAIM_ATTEMPTS) {
      throw new ConflictException(
        'No se pudo procesar esta operación, intenta de nuevo',
      );
    }

    // Reserva abandonada (más vieja que la ventana): la retoma de forma
    // atómica con un UPDATE condicionado a que reservedAt siga siendo el
    // mismo que se acaba de leer (bloqueo optimista) — si otra petición
    // la retoma o la completa en el instante entre el read y este
    // update, count queda en 0 y se reintenta desde el principio.
    const reclaimed = await this.prisma.idempotencyKey.updateMany({
      where: { id: existing.id, reservedAt: existing.reservedAt },
      data: {
        reservedAt: new Date(),
        userId,
        operation,
        statusCode: null,
        responseBody: Prisma.JsonNull,
      },
    });

    if (reclaimed.count === 1) {
      return { mode: 'execute', reservationId: existing.id };
    }

    return this.acquireOrGetCached(
      key,
      companyId,
      userId,
      operation,
      attempt + 1,
    );
  }

  /** El handler terminó bien: guarda la respuesta, la reserva queda "completada". */
  private async complete(
    reservationId: string,
    context: ExecutionContext,
    responseBody: unknown,
  ): Promise<unknown> {
    const statusCode =
      this.reflector.get<number | undefined>(
        HTTP_CODE_METADATA,
        context.getHandler(),
      ) ??
      (context.switchToHttp().getRequest<{ method: string }>().method === 'POST'
        ? 201
        : 200);

    // JSON.parse(JSON.stringify(...)): normaliza Decimal/Date igual que
    // res.json() del lado de Express — así lo guardado es exactamente lo
    // que el primer cliente recibió, no el objeto JS con tipos de Prisma.
    const serialized = JSON.parse(
      JSON.stringify(responseBody),
    ) as Prisma.InputJsonValue;

    await this.prisma.idempotencyKey.update({
      where: { id: reservationId },
      data: { statusCode, responseBody: serialized },
    });

    return responseBody;
  }

  /** El handler falló: libera la reserva — una llave que falló NO queda guardada, se puede reintentar tal cual. */
  private async release(reservationId: string): Promise<void> {
    await this.prisma.idempotencyKey
      .delete({ where: { id: reservationId } })
      .catch(() => undefined);
  }
}
