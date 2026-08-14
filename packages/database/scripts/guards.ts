/**
 * Candado anti-producción para scripts destructivos del paquete database
 * (seed-dev, reset-pilot). Dos verificaciones independientes a propósito:
 * APP_ENV depende de una variable que alguien podría configurar mal; el
 * host es un hecho verificable de la connection string. Que fallen las
 * dos a la vez, por accidente, es mucho menos probable que fallar una
 * sola — por eso no basta con revisar solo una.
 *
 * Debe llamarse como PRIMERA operación del script, antes de leer nada más
 * y antes de conectarse a la base.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);

function extractHost(databaseUrl: string): string {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return '<no se pudo parsear DATABASE_URL>';
  }
}

export function assertDevelopment(): void {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const host = extractHost(databaseUrl);

  // SIEMPRE visible en la terminal, ANTES de decidir nada: la mayoría de
  // los accidentes se evitan simplemente viendo a dónde se apunta.
  console.log(`>> Base de datos destino: ${host}`);

  const appEnv = process.env.APP_ENV;
  if (appEnv !== 'development') {
    throw new Error(
      `FATAL: APP_ENV='${appEnv ?? '(sin definir)'}' — este script requiere ` +
        `APP_ENV=development y se niega a correr en cualquier otro caso.`,
    );
  }

  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `FATAL: la base de datos destino ("${host}") no es localhost ni ` +
        '127.0.0.1 — este script solo puede correr contra la base local ' +
        'de desarrollo (ver docker-compose.yml).',
    );
  }
}
