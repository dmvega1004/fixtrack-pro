import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

/** Vida de una entrada. Es también la demora máxima de revocación si hay VARIAS instancias (ver abajo). */
export const AUTH_USER_CACHE_TTL_MS = 30_000;

/** Tope de entradas: cota de memoria, no de rendimiento (una empresa tiene decenas de usuarios). */
const MAX_ENTRIES = 5_000;

interface Entry {
  user: AuthenticatedUser;
  expiresAt: number;
}

/**
 * Caché en memoria de la fila de usuario que JwtStrategy.validate lee en
 * CADA petición autenticada. Antes, abrir el detalle de una orden hacía 11
 * consultas idénticas a User (una por llamada HTTP en paralelo).
 *
 * ─── REVOCACIÓN: LO QUE ESTA CACHÉ NO PUEDE ROMPER ───────────────────────
 * El sistema NO tiene campo de activo/inactivo: desactivar a alguien es
 * BORRARLO, y el borrado solo surte efecto porque validate re-lee la fila.
 * Por eso todo método que cambie lo que validate devuelve (rol, empresa,
 * nombre, correo, mustChangePassword, firma) o que BORRE un usuario llama
 * a `invalidate(userId)` en el mismo método, justo después de escribir.
 * El test auth-user-cache.invariant.spec.ts falla si alguna función del
 * backend escribe en `user` sin llamar a invalidate.
 *
 * ─── SUPUESTO: UNA SOLA INSTANCIA DEL BACKEND ───────────────────────────
 * invalidate() solo limpia la memoria de ESTE proceso. Hoy Railway corre
 * una sola instancia, así que la revocación es inmediata. Con DOS o más
 * réplicas, un usuario borrado o degradado seguiría entrando hasta
 * AUTH_USER_CACHE_TTL_MS en las otras réplicas, sin ningún error visible.
 * Antes de escalar: invalidación compartida (Redis pub/sub, LISTEN/NOTIFY
 * de Postgres) o quitar esta caché. Ver DEPLOY.md, «Una sola instancia».
 * Lo mismo vale para procesos aparte que escriben User (scripts de
 * packages/database como reset-pilot): no invalidan esta memoria.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Carrera que evita la generación por usuario: una petición lee la fila
 * VIEJA, el cambio se escribe e invalida, y la petición guarda la fila vieja
 * DESPUÉS → quedaría vieja otros 30 s. `generation()` se toma ANTES de leer
 * y `set()` descarta lo leído si hubo un invalidate entre medio.
 */
@Injectable()
export class AuthUserCache implements OnModuleInit {
  private readonly logger = new Logger(AuthUserCache.name);
  private readonly entries = new Map<string, Entry>();
  private readonly generations = new Map<string, number>();
  /** Sube con invalidateAll: invalida también las lecturas en curso de TODOS. */
  private epoch = 0;

  onModuleInit(): void {
    this.logger.log(
      `Caché de usuario autenticado activa (TTL ${AUTH_USER_CACHE_TTL_MS / 1000} s). ` +
        'Supone UNA sola instancia del backend: con réplicas, la revocación de ' +
        'usuarios borrados o degradados se demora hasta el TTL. Ver DEPLOY.md.',
    );
  }

  get(userId: string): AuthenticatedUser | null {
    const entry = this.entries.get(userId);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(userId);
      return null;
    }
    return entry.user;
  }

  /** Tomarla ANTES de leer la fila; pasarla a set(). */
  generation(userId: string): string {
    return `${this.epoch}:${this.generations.get(userId) ?? 0}`;
  }

  set(userId: string, user: AuthenticatedUser, generation: string): void {
    if (this.generation(userId) !== generation) return; // hubo invalidate mientras se leía
    if (this.entries.size >= MAX_ENTRIES) {
      // Map conserva el orden de inserción: se descarta la más antigua.
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(userId, {
      user,
      expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
    });
  }

  /**
   * Llamar DESPUÉS de que la escritura quedó confirmada (si va en una
   * transacción, después del $transaction): invalidar antes del commit
   * deja una ventana en la que otra petición vuelve a cachear la fila vieja.
   */
  invalidate(userId: string): void {
    this.entries.delete(userId);
    this.generations.set(userId, (this.generations.get(userId) ?? 0) + 1);
  }

  /**
   * Para escrituras masivas (updateMany/deleteMany) en las que no se sabe
   * qué usuarios cambiaron. Mismas reglas que invalidate: después del commit.
   */
  invalidateAll(): void {
    this.entries.clear();
    this.epoch += 1;
  }
}

@Module({
  providers: [AuthUserCache],
  exports: [AuthUserCache],
})
export class AuthUserCacheModule {}
