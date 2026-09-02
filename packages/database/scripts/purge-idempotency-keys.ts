/**
 * Purga las llaves de idempotencia (tabla IdempotencyKey) más viejas que
 * el plazo de retención — existen solo para proteger reintentos de la
 * cola de sincronización del celular contra la ventana en que un cliente
 * real podría reintentar (ver packages/backend/src/idempotency); pasado
 * ese plazo no protegen nada y solo ocupan espacio.
 *
 * RETENCIÓN: 7 días. Cubre con margen a un técnico que estuvo varios días
 * sin señal en un sitio remoto antes de que su cola reintente al volver
 * la conexión, sin dejar crecer la tabla indefinidamente.
 *
 * Piensa en correr esto en un cron externo (Railway u otro), NO como un
 * job en proceso dentro de NestJS — este backend no usa @nestjs/schedule
 * hoy en ningún otro lado, y no hay motivo para sumarlo por esto.
 *
 * Uso:
 *   pnpm --filter database exec tsx scripts/purge-idempotency-keys.ts              # dry-run (no borra nada)
 *   pnpm --filter database exec tsx scripts/purge-idempotency-keys.ts --dry-run    # dry-run explícito
 *   pnpm --filter database exec tsx scripts/purge-idempotency-keys.ts --confirm    # ejecuta de verdad
 *
 * Seguro para correr contra cualquier ambiente (incluida producción) —
 * a diferencia de seed-dev.ts/reset-pilot.ts, esto no está detrás de
 * assertDevelopment(): es justamente el job que se programa en real.
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { PrismaClient } from '../index.js';
import { PrismaPg } from '@prisma/adapter-pg';

const RETENTION_DAYS = 7;

function parseArgs() {
  const args = process.argv.slice(2);
  return { confirm: args.includes('--confirm') };
}

async function main() {
  const { confirm } = parseArgs();

  const databaseUrl = process.env.DATABASE_URL as string;
  if (!databaseUrl) {
    throw new Error(
      'FATAL: falta la variable de entorno DATABASE_URL. Revisa packages/database/.env.',
    );
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  try {
    const matching = await prisma.idempotencyKey.count({
      where: { createdAt: { lt: cutoff } },
    });

    console.log(
      `Llaves de idempotencia creadas antes de ${cutoff.toISOString()} (retención: ${RETENTION_DAYS} días): ${matching}`,
    );

    if (!confirm) {
      console.log(
        '\nDRY-RUN — no se borró nada. Vuelve a correr con --confirm para purgar de verdad.',
      );
      return;
    }

    if (matching === 0) {
      console.log('Nada que purgar.');
      return;
    }

    const { count } = await prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    console.log(`Purgadas ${count} llaves de idempotencia.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
