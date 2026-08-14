/**
 * Respaldo completo de la base de datos de FixTrack Pro.
 *
 * Ejecuta `pg_dump` contra DATABASE_URL en formato custom (-Fc): comprimido
 * y capaz de restaurar tablas sueltas con pg_restore (no solo la base
 * entera). El archivo se guarda con marca de tiempo en `backups/` en la
 * raíz del repo — esa carpeta está en .gitignore porque el volcado
 * contiene nombres de clientes, NITs, montos y contraseñas hasheadas.
 *
 * Uso:
 *   pnpm --filter database run backup
 *
 * Restauración: ver packages/database/README.md.
 */
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REPO_ROOT = path.resolve(__dirname, '../../..');
const BACKUPS_DIR = path.join(REPO_ROOT, 'backups');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `FATAL: falta la variable de entorno ${name}. Revisa packages/database/.env.`,
    );
  }
  return value;
}

/** Falla con instrucciones claras si pg_dump no está disponible en el PATH. */
function assertPgDumpInstalled(): void {
  const check = spawnSync('pg_dump', ['--version'], { stdio: 'ignore' });
  if (check.error && (check.error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new Error(
      [
        'FATAL: pg_dump no está instalado o no está en tu PATH.',
        '',
        'Instálalo en macOS con:',
        '  brew install libpq',
        '',
        'libpq es "keg-only" (no se enlaza solo) — agrégalo a tu PATH con:',
        '  echo \'export PATH="$(brew --prefix libpq)/bin:$PATH"\' >> ~/.zshrc && source ~/.zshrc',
      ].join('\n'),
    );
  }
}

function timestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${y}-${mo}-${d}-${h}${mi}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function main() {
  const databaseUrl = requireEnv('DATABASE_URL');
  assertPgDumpInstalled();

  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const fileName = `fixtrack-${timestamp(new Date())}.dump`;
  const outputPath = path.join(BACKUPS_DIR, fileName);

  console.log(`Respaldando base de datos en formato custom (-Fc)...`);
  const result = spawnSync(
    'pg_dump',
    ['-Fc', '-d', databaseUrl, '-f', outputPath],
    { stdio: 'inherit' },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`FATAL: pg_dump terminó con código de salida ${result.status}.`);
  }

  const { size } = fs.statSync(outputPath);
  console.log('');
  console.log(`Respaldo completado: ${outputPath}`);
  console.log(`Tamaño: ${formatSize(size)}`);
  if (size === 0) {
    console.warn('ADVERTENCIA: el archivo de respaldo quedó vacío (0 bytes).');
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
