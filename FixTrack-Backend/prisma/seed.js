const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Creando usuario administrador...');

  const adminEmail = 'admin@taelco.com';
  const adminPassword = '123456';

  // 1. Crear empresa si no existe
  let empresa = await prisma.empresa.findUnique({
    where: { nit: '901618888-5' },
  });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: 'TAELCO Systems',
        nit: '901618888-5',
      },
    });
    console.log('🏢 Empresa creada:', empresa.nombre);
  } else {
    console.log('🏢 Empresa existente detectada');
  }

  // 2. Crear admin si no existe
  let admin = await prisma.usuario.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    admin = await prisma.usuario.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Administrador',
        email: adminEmail,
        password: hashedPassword,
        rol: 'ADMIN',
      },
    });

    console.log(`👤 Usuario admin creado: ${admin.email}`);
  } else {
    console.log('👤 Usuario admin ya existe');
  }

  console.log('✔ Seed completado sin datos adicionales.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
