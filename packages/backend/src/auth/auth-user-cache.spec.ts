/// <reference types="jest" />
import { Role } from 'database';
import { AUTH_USER_CACHE_TTL_MS, AuthUserCache } from './auth-user-cache';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

const user = (role: Role = Role.ADMIN): AuthenticatedUser => ({
  userId: 'u1',
  email: 'a@b.c',
  name: 'A',
  role,
  companyId: 'c1',
  mustChangePassword: false,
  documentNumber: null,
  signatureImageUrl: null,
});

describe('AuthUserCache', () => {
  afterEach(() => jest.useRealTimers());

  it('devuelve lo guardado y lo olvida al vencer el TTL', () => {
    jest.useFakeTimers();
    const cache = new AuthUserCache();
    cache.set('u1', user(), cache.generation('u1'));
    expect(cache.get('u1')?.role).toBe(Role.ADMIN);
    jest.advanceTimersByTime(AUTH_USER_CACHE_TTL_MS);
    expect(cache.get('u1')).toBeNull();
  });

  it('invalidate borra la entrada en el acto', () => {
    const cache = new AuthUserCache();
    cache.set('u1', user(), cache.generation('u1'));
    cache.invalidate('u1');
    expect(cache.get('u1')).toBeNull();
  });

  it('carrera: lo leído ANTES de un invalidate no se guarda después', () => {
    const cache = new AuthUserCache();
    // 1. validate toma la generación y empieza a leer la fila (rol viejo)
    const generation = cache.generation('u1');
    // 2. mientras tanto el ADMIN lo degrada: escritura + invalidate
    cache.invalidate('u1');
    // 3. validate termina y quiere guardar la fila VIEJA → se descarta
    cache.set('u1', user(Role.ADMIN), generation);
    expect(cache.get('u1')).toBeNull();
    // 4. la siguiente lectura (generación nueva) sí se guarda
    cache.set('u1', user(Role.TECHNICIAN), cache.generation('u1'));
    expect(cache.get('u1')?.role).toBe(Role.TECHNICIAN);
  });
});

describe('AuthUserCache.invalidateAll', () => {
  it('vacía todo y descarta las lecturas que estaban en curso', () => {
    const cache = new AuthUserCache();
    cache.set('u1', user(), cache.generation('u1'));
    const inFlight = cache.generation('u2');
    cache.invalidateAll();
    cache.set('u2', user(), inFlight);
    expect(cache.get('u1')).toBeNull();
    expect(cache.get('u2')).toBeNull();
  });
});
