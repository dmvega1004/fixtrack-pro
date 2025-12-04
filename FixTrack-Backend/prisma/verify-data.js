const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyData() {
  console.log('🔍 Verificando datos en la base de datos...\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar Empresa
    console.log('\n📦 EMPRESA:');
    const empresa = await prisma.empresa.findUnique({
      where: { nit: '901618888-5' },
      include: {
        usuarios: true,
        clientes: true,
        equipos: true,
      },
    });

    if (empresa) {
      console.log(`✅ Empresa encontrada:`);
      console.log(`   ID: ${empresa.id}`);
      console.log(`   Nombre: ${empresa.nombre}`);
      console.log(`   NIT: ${empresa.nit}`);
      console.log(`   Dirección: ${empresa.direccion || 'N/A'}`);
      console.log(`   Teléfono: ${empresa.telefono || 'N/A'}`);
      console.log(`   Email: ${empresa.email || 'N/A'}`);
      console.log(`   Creado: ${empresa.creadoEn.toLocaleString()}`);
      console.log(`\n   📊 Relaciones:`);
      console.log(`      - Usuarios: ${empresa.usuarios.length}`);
      console.log(`      - Clientes: ${empresa.clientes.length}`);
      console.log(`      - Equipos: ${empresa.equipos.length}`);
    } else {
      console.log('❌ Empresa no encontrada con NIT: 901618888-5');
    }

    // 2. Verificar Usuario Admin
    console.log('\n👤 USUARIO ADMIN:');
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'admin@taelco.com' },
      include: {
        empresa: true,
      },
    });

    if (usuario) {
      console.log(`✅ Usuario encontrado:`);
      console.log(`   ID: ${usuario.id}`);
      console.log(`   Nombre: ${usuario.nombre}`);
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Rol: ${usuario.rol}`);
      console.log(`   Teléfono: ${usuario.telefono || 'N/A'}`);
      console.log(`   Activo: ${usuario.activo ? 'Sí' : 'No'}`);
      console.log(`   Empresa: ${usuario.empresa.nombre}`);
      console.log(`   Creado: ${usuario.creadoEn.toLocaleString()}`);
    } else {
      console.log('❌ Usuario admin no encontrado');
    }

    // 3. Verificar Cliente
    console.log('\n👥 CLIENTE:');
    const cliente = await prisma.cliente.findFirst({
      where: {
        empresaId: empresa?.id,
        nombre: 'Cliente Demo S.A.S.',
      },
      include: {
        empresa: true,
        equipos: true,
      },
    });

    if (cliente) {
      console.log(`✅ Cliente encontrado:`);
      console.log(`   ID: ${cliente.id}`);
      console.log(`   Nombre: ${cliente.nombre}`);
      console.log(`   Contacto: ${cliente.contacto || 'N/A'}`);
      console.log(`   Teléfono: ${cliente.telefono || 'N/A'}`);
      console.log(`   Dirección: ${cliente.direccion || 'N/A'}`);
      console.log(`   Email: ${cliente.email || 'N/A'}`);
      console.log(`   Empresa: ${cliente.empresa.nombre}`);
      console.log(`   Equipos asociados: ${cliente.equipos.length}`);
      console.log(`   Creado: ${cliente.creadoEn.toLocaleString()}`);
    } else {
      console.log('❌ Cliente no encontrado');
    }

    // 4. Verificar Equipo
    console.log('\n💻 EQUIPO:');
    const equipo = await prisma.equipo.findUnique({
      where: { codigoQR: 'EQ-TAELCO-001' },
      include: {
        empresa: true,
        tipoEquipo: true,
        cliente: true,
      },
    });

    if (equipo) {
      console.log(`✅ Equipo encontrado:`);
      console.log(`   ID: ${equipo.id}`);
      console.log(`   Nombre: ${equipo.nombre}`);
      console.log(`   Código QR: ${equipo.codigoQR}`);
      console.log(`   Tipo: ${equipo.tipoEquipo.nombre}`);
      console.log(`   Marca: ${equipo.marca || 'N/A'}`);
      console.log(`   Modelo: ${equipo.modelo || 'N/A'}`);
      console.log(`   Serie: ${equipo.serie || 'N/A'}`);
      console.log(`   Ubicación: ${equipo.ubicacion || 'N/A'}`);
      console.log(`   Estado: ${equipo.estado}`);
      console.log(`   Cliente: ${equipo.cliente.nombre}`);
      console.log(`   Empresa: ${equipo.empresa.nombre}`);
      if (equipo.fechaInstalacion) {
        console.log(`   Fecha Instalación: ${equipo.fechaInstalacion.toLocaleDateString()}`);
      }
      console.log(`   Creado: ${equipo.creadoEn.toLocaleString()}`);
    } else {
      console.log('❌ Equipo no encontrado');
    }

    // 5. Verificar TipoEquipo
    console.log('\n🔧 TIPO DE EQUIPO:');
    const tipoEquipo = await prisma.tipoEquipo.findUnique({
      where: { nombre: 'Servidor' },
      include: {
        equipos: true,
      },
    });

    if (tipoEquipo) {
      console.log(`✅ TipoEquipo encontrado:`);
      console.log(`   ID: ${tipoEquipo.id}`);
      console.log(`   Nombre: ${tipoEquipo.nombre}`);
      console.log(`   Equipos asociados: ${tipoEquipo.equipos.length}`);
    } else {
      console.log('❌ TipoEquipo no encontrado');
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN:');
    console.log(`   ✅ Empresa: ${empresa ? 'Encontrada' : 'No encontrada'}`);
    console.log(`   ✅ Usuario Admin: ${usuario ? 'Encontrado' : 'No encontrado'}`);
    console.log(`   ✅ Cliente: ${cliente ? 'Encontrado' : 'No encontrado'}`);
    console.log(`   ✅ Equipo: ${equipo ? 'Encontrado' : 'No encontrado'}`);
    console.log(`   ✅ TipoEquipo: ${tipoEquipo ? 'Encontrado' : 'No encontrado'}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();

