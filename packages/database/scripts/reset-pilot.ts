/**
 * Reset de datos para el piloto de TAELCO.
 *
 * Conserva la empresa TAELCO (identificada por el companyId del usuario
 * ADMIN_EMAIL) con toda su configuración y a ese usuario admin. Borra todo
 * el resto de datos de TAELCO (Attachments, WorkOrderParts, WorkOrders,
 * Equipments, Clients, SpareParts, usuarios no-admin) y elimina por
 * completo cualquier otra empresa (datos de prueba QA) junto con sus
 * assets en Cloudinary. Reinicia Company.nextOrderNumber a 1 en TAELCO.
 *
 * Uso:
 *   pnpm --filter database exec tsx scripts/reset-pilot.ts              # dry-run (no borra nada)
 *   pnpm --filter database exec tsx scripts/reset-pilot.ts --dry-run    # dry-run explícito
 *   pnpm --filter database exec tsx scripts/reset-pilot.ts --confirm   # ejecuta de verdad
 */
import path from 'node:path';
import dotenv from 'dotenv';

// Carga primero el .env del propio paquete (DATABASE_URL) y luego el del
// backend (CLOUDINARY_*), sin pisar variables ya definidas en el entorno.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

import { assertDevelopment } from './guards';
// Primera operación del script, antes de leer o conectar nada más: corta
// la ejecución si esto no es inequívocamente la base local de desarrollo.
try {
  assertDevelopment();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

import { PrismaClient } from '../index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { v2 as cloudinary } from 'cloudinary';

const ADMIN_EMAIL = 'david@taelco.com';

function parseArgs() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');
  const explicitDryRun = args.includes('--dry-run');

  if (confirm && explicitDryRun) {
    throw new Error(
      'No se puede pasar --confirm y --dry-run al mismo tiempo: son contradictorios.',
    );
  }

  return { dryRun: !confirm };
}

/** Oculta usuario/contraseña de una connection string para mostrarla en el reporte. */
function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
  } catch {
    return '<no se pudo parsear DATABASE_URL>';
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `FATAL: falta la variable de entorno ${name}. Revisa packages/database/.env y packages/backend/.env.`,
    );
  }
  return value;
}

async function main() {
  const { dryRun } = parseArgs();

  const databaseUrl = requireEnv('DATABASE_URL');
  const cloudName = requireEnv('CLOUDINARY_CLOUD_NAME');
  const apiKey = requireEnv('CLOUDINARY_API_KEY');
  const apiSecret = requireEnv('CLOUDINARY_API_SECRET');

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      include: { company: true },
    });

    if (!adminUser) {
      throw new Error(
        `FATAL: no se encontró el usuario ${ADMIN_EMAIL}. Abortando sin tocar nada.`,
      );
    }

    const taelco = adminUser.company;
    const qaCompanies = await prisma.company.findMany({
      where: { id: { not: taelco.id } },
      select: { id: true, name: true },
    });
    const qaCompanyIds = qaCompanies.map((c) => c.id);
    const allCompanyIds = [taelco.id, ...qaCompanyIds];

    const [
      attachmentCount,
      workOrderPartCount,
      workOrderCount,
      equipmentCount,
      clientCount,
      sparePartCount,
      usersToDeleteCount,
    ] = await Promise.all([
      prisma.attachment.count({ where: { companyId: { in: allCompanyIds } } }),
      prisma.workOrderPart.count({
        where: { companyId: { in: allCompanyIds } },
      }),
      prisma.workOrder.count({ where: { companyId: { in: allCompanyIds } } }),
      prisma.equipment.count({ where: { companyId: { in: allCompanyIds } } }),
      prisma.client.count({ where: { companyId: { in: allCompanyIds } } }),
      prisma.sparePart.count({ where: { companyId: { in: allCompanyIds } } }),
      prisma.user.count({
        where: { companyId: { in: allCompanyIds }, id: { not: adminUser.id } },
      }),
    ]);

    // Attachments a purgar en Cloudinary (folder fixtrack/{companyId}/orders/...).
    // logoUrl / fixtrack/{companyId}/brand NUNCA se tocan: no viven en esta tabla.
    const attachmentsToPurge = await prisma.attachment.findMany({
      where: { companyId: { in: allCompanyIds } },
      select: { publicId: true, companyId: true },
    });

    // --- Reporte ---
    console.log('='.repeat(70));
    console.log(
      dryRun
        ? 'DRY-RUN — no se modificará nada (usa --confirm para ejecutar de verdad)'
        : 'EJECUCIÓN REAL — se van a borrar datos de forma permanente',
    );
    console.log('='.repeat(70));
    console.log(`Base de datos objetivo: ${maskDatabaseUrl(databaseUrl)}`);
    console.log(`Cuenta de Cloudinary: ${cloudName}`);
    console.log('');

    console.log('SE CONSERVARÁ:');
    console.log(`  Empresa TAELCO (id=${taelco.id})`);
    console.log(`    name:     ${taelco.name}`);
    console.log(`    slogan:   ${taelco.slogan ?? '(sin cambios)'}`);
    console.log(`    phone:    ${taelco.phone ?? '(sin cambios)'}`);
    console.log(`    email:    ${taelco.email ?? '(sin cambios)'}`);
    console.log(`    address:  ${taelco.address ?? '(sin cambios)'}`);
    console.log(`    website:  ${taelco.website ?? '(sin cambios)'}`);
    console.log(`    logoUrl:  ${taelco.logoUrl ?? '(sin cambios)'}`);
    console.log(`    currency: ${taelco.currency}`);
    console.log(
      `  Usuario admin: ${adminUser.email} (id=${adminUser.id}, name=${adminUser.name})`,
    );
    console.log('');

    console.log('SE BORRARÁ de TAELCO y de las empresas QA (todas las demás):');
    console.log(`  Attachments:     ${attachmentCount}`);
    console.log(`  WorkOrderParts:  ${workOrderPartCount}`);
    console.log(`  WorkOrders:      ${workOrderCount}`);
    console.log(`  Equipments:      ${equipmentCount}`);
    console.log(`  Clients:         ${clientCount}`);
    console.log(`  SpareParts:      ${sparePartCount}`);
    console.log(
      `  Users (todos excepto ${ADMIN_EMAIL}): ${usersToDeleteCount}`,
    );
    console.log('');

    console.log(`SE BORRARÁN POR COMPLETO ${qaCompanies.length} empresa(s) QA:`);
    if (qaCompanies.length === 0) {
      console.log('  (ninguna — no hay empresas distintas de TAELCO)');
    } else {
      for (const c of qaCompanies) {
        console.log(`  - ${c.name} (id=${c.id})`);
      }
    }
    console.log('');

    console.log(
      `SE BORRARÁN en Cloudinary: ${attachmentsToPurge.length} asset(s) (carpetas fixtrack/{companyId}/orders/...)`,
    );
    console.log(
      '  NUNCA se toca fixtrack/{companyId}/brand (logo de TAELCO).',
    );
    console.log('');

    console.log('SE REINICIARÁ:');
    console.log(
      `  Company.nextOrderNumber de TAELCO -> 1 (actual: ${taelco.nextOrderNumber})`,
    );
    console.log('');

    if (dryRun) {
      console.log(
        'Nada fue modificado. Ejecuta con --confirm para aplicar estos cambios.',
      );
      return;
    }

    console.log('Borrando en base de datos (transacción)...');
    await prisma.$transaction(async (tx) => {
      await tx.attachment.deleteMany({
        where: { companyId: { in: allCompanyIds } },
      });
      await tx.workOrderPart.deleteMany({
        where: { companyId: { in: allCompanyIds } },
      });
      await tx.workOrder.deleteMany({
        where: { companyId: { in: allCompanyIds } },
      });
      await tx.equipment.deleteMany({
        where: { companyId: { in: allCompanyIds } },
      });
      await tx.client.deleteMany({
        where: { companyId: { in: allCompanyIds } },
      });
      await tx.sparePart.deleteMany({
        where: { companyId: { in: allCompanyIds } },
      });
      await tx.user.deleteMany({
        where: {
          companyId: { in: allCompanyIds },
          id: { not: adminUser.id },
        },
      });
      await tx.company.deleteMany({ where: { id: { in: qaCompanyIds } } });
      await tx.company.update({
        where: { id: taelco.id },
        data: { nextOrderNumber: 1 },
      });
    });
    console.log('Transacción confirmada.');

    console.log(
      `Borrando ${attachmentsToPurge.length} asset(s) en Cloudinary (best-effort)...`,
    );
    let cloudinaryOk = 0;
    let cloudinaryFailed = 0;
    for (const attachment of attachmentsToPurge) {
      try {
        await cloudinary.uploader.destroy(attachment.publicId, {
          resource_type: 'image',
        });
        cloudinaryOk++;
      } catch (error) {
        cloudinaryFailed++;
        console.error(
          `  FALLÓ borrado de Cloudinary publicId=${attachment.publicId} (company=${attachment.companyId}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    console.log(
      `Cloudinary: ${cloudinaryOk} borrados, ${cloudinaryFailed} fallidos (revisa el log de arriba si hay fallos).`,
    );

    console.log('');
    console.log('Reset del piloto completado.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
