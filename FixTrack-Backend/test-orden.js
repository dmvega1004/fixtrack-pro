// test-orden.js - Script para probar el módulo de órdenes de trabajo
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Error en la petición');
    error.data = data;
    throw error;
  }
  return data;
}

async function probarOrdenes() {
  console.log('🔵 Iniciando pruebas del módulo de Órdenes...\n');

  try {
    // 1. Login
    console.log('1️⃣ Haciendo login como admin...');
    const loginResp = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@taelco.com', password: '123456' }),
    });
    const token = loginResp.data.token;
    const admin = loginResp.data.user;
    console.log('✅ Login exitoso. Token obtenido.\n');

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // 2. Obtener cliente (o crear uno)
    console.log('2️⃣ Obteniendo/creando cliente para la orden...');
    let clientes = await request('/clientes', {
      method: 'GET',
      headers: authHeaders,
    });

    let clienteId;
    if (clientes.count === 0) {
      const nuevoCliente = await request('/clientes', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          nombre: 'Cliente Orden Demo',
          contacto: 'Luis Gómez',
          telefono: '+57 1 7654321',
          direccion: 'Carrera 15 #80-20, Bogotá',
          email: 'cliente.orden@demo.com',
        }),
      });
      clienteId = nuevoCliente.data.id;
      console.log(`✅ Cliente creado: ${nuevoCliente.data.nombre} (ID ${clienteId})\n`);
    } else {
      clienteId = clientes.data[0].id;
      console.log(`✅ Usando cliente existente: ${clientes.data[0].nombre} (ID ${clienteId})\n`);
    }

    // 3. Obtener equipo opcional
    console.log('3️⃣ Verificando si existe equipo para asociar...');
    const equiposResp = await fetch(`${BASE_URL}/equipos?limit=1`, {
      method: 'GET',
      headers: authHeaders,
    });
    let equipoId = null;
    if (equiposResp.ok) {
      const equiposData = await equiposResp.json();
      if (equiposData.count > 0) {
        equipoId = equiposData.data[0].id;
        console.log(`✅ Se asociará el equipo: ${equiposData.data[0].nombre} (ID ${equipoId})\n`);
      } else {
        console.log('⚠️  No hay equipos disponibles. La orden se creará sin equipo.\n');
      }
    }

    // 4. Crear orden
    console.log('4️⃣ Creando una nueva orden de trabajo...');
    const nuevaOrden = await request('/ordenes', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        clienteId,
        equipoId,
        titulo: 'Mantenimiento preventivo Servidor',
        descripcion: 'Se requiere mantenimiento preventivo del servidor principal.',
        tipo: 'PREVENTIVO',
        prioridad: 'ALTA',
        fechaInicio: new Date().toISOString(),
        observaciones: 'Creada desde test automatizado',
      }),
    });
    const orden = nuevaOrden.data;
    console.log(`✅ Orden creada: ${orden.codigo} (ID ${orden.id})\n`);

    // 5. Listar órdenes con paginación
    console.log('5️⃣ Listando órdenes (página 1, límite 5)...');
    const listado = await request('/ordenes?page=1&limit=5', {
      method: 'GET',
      headers: authHeaders,
    });
    console.log(`✅ Total órdenes encontradas: ${listado.meta.total}`);
    listado.data.forEach((o, index) => {
      console.log(`   ${index + 1}. ${o.codigo} - ${o.titulo} (${o.estado})`);
    });
    console.log('');

    // 6. Obtener detalle de la orden
    console.log('6️⃣ Obteniendo detalle de la orden creada...');
    const detalle = await request(`/ordenes/${orden.id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    console.log(`✅ Detalle obtenido: ${detalle.data.codigo} - Estado: ${detalle.data.estado}\n`);

    // 7. Asignar técnico (usaremos el admin)
    console.log('7️⃣ Asignando técnico (admin)...');
    const asignar = await request(`/ordenes/${orden.id}/asignar`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ tecnicoId: admin.id }),
    });
    console.log(`✅ Técnico asignado: ${asignar.data.tecnico?.nombre || 'N/A'}\n`);

    // 8. Cambiar estado a EN_PROCESO
    console.log('8️⃣ Cambiando estado a EN_PROCESO...');
    const estadoProceso = await request(`/ordenes/${orden.id}/estado`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ estado: 'EN_PROCESO', comentario: 'Orden en ejecución' }),
    });
    console.log(`✅ Estado actualizado: ${estadoProceso.data.estado}\n`);

    // 9. Cambiar estado a TERMINADO
    console.log('9️⃣ Cambiando estado a TERMINADO...');
    const estadoFinal = await request(`/ordenes/${orden.id}/estado`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ estado: 'TERMINADO', comentario: 'Trabajo completado' }),
    });
    console.log(`✅ Estado final: ${estadoFinal.data.estado}\n`);

    console.log('🎉 Pruebas de órdenes completadas exitosamente.');
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    if (error.data) {
      console.error('Detalles:', JSON.stringify(error.data, null, 2));
    }
  }
}

probarOrdenes();

