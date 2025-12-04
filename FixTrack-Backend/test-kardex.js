// test-kardex.js - Script para probar el módulo de Kardex CPP
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000/api';
let token = null;

(async () => {
  try {
    console.log('🔵 Iniciando pruebas del módulo de Kardex CPP...\n');

    // -------------------------------------------------------------
    // 1️⃣ LOGIN COMO ADMIN
    // -------------------------------------------------------------
    console.log('1️⃣ Haciendo login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@taelco.com',
        password: '123456',
      }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('❌ Error al hacer login');

    token = loginData.data.token;
    console.log('✅ Login exitoso. Token obtenido.\n');

    // -------------------------------------------------------------
    // 2️⃣ CREAR O USAR REPUESTO PARA PRUEBAS
    // -------------------------------------------------------------
    console.log('2️⃣ Buscando repuesto para pruebas...');
    const repuestosRes = await fetch(`${BASE_URL}/repuestos`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const repuestosData = await repuestosRes.json();
    const repuestos = repuestosData.items || repuestosData.data || repuestosData;

    let repuestoId;
    if (repuestos && repuestos.length > 0) {
      repuestoId = repuestos[0].id;
      console.log(`✅ Usando repuesto existente: ${repuestos[0].nombre} (ID ${repuestoId})\n`);
    } else {
      console.log('🟡 Creando nuevo repuesto para pruebas...');
      const nuevoRes = await fetch(`${BASE_URL}/repuestos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: 'Resistor 10K',
          descripcion: 'Resistor para pruebas de kardex',
          stock: 0,
          precioUnit: 500,
        }),
      });

      const nuevo = await nuevoRes.json();
      if (!nuevoRes.ok) {
        console.error('❌ Error al crear repuesto:', nuevo);
        throw new Error('❌ Fallo en la creación del repuesto');
      }

      repuestoId = nuevo.id || nuevo.data?.id;
      console.log(`✅ Repuesto creado: ID ${repuestoId}\n`);
    }

    // -------------------------------------------------------------
    // 3️⃣ CREAR MOVIMIENTOS CON DIFERENTES COSTOS PARA CPP
    // -------------------------------------------------------------
    console.log('3️⃣ Creando movimientos de INGRESO con diferentes costos...\n');

    // Movimiento 1: Ingreso de 10 unidades a $500 c/u
    console.log('   📦 Ingreso 1: 10 unidades a $500 c/u');
    const ingreso1 = await fetch(`${BASE_URL}/repuestos/${repuestoId}/movimientos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'INGRESO',
        cantidad: 10,
        unitCost: 500,
        nota: 'Compra inicial - Proveedor A',
      }),
    });
    const ingreso1Data = await ingreso1.json();
    if (ingreso1.ok) {
      console.log(`      ✅ Movimiento creado. Stock: ${ingreso1Data.newStock || 'N/A'}\n`);
    } else {
      console.log(`      ❌ Error: ${ingreso1Data.error}\n`);
    }

    // Esperar un momento para que las fechas sean diferentes
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Movimiento 2: Ingreso de 5 unidades a $600 c/u
    console.log('   📦 Ingreso 2: 5 unidades a $600 c/u');
    const ingreso2 = await fetch(`${BASE_URL}/repuestos/${repuestoId}/movimientos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'INGRESO',
        cantidad: 5,
        unitCost: 600,
        nota: 'Compra adicional - Proveedor B',
      }),
    });
    const ingreso2Data = await ingreso2.json();
    if (ingreso2.ok) {
      console.log(`      ✅ Movimiento creado. Stock: ${ingreso2Data.newStock || 'N/A'}\n`);
    } else {
      console.log(`      ❌ Error: ${ingreso2Data.error}\n`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Movimiento 3: Salida de 3 unidades
    console.log('   📤 Salida: 3 unidades');
    const salida1 = await fetch(`${BASE_URL}/repuestos/${repuestoId}/movimientos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'SALIDA',
        cantidad: 3,
        nota: 'Uso en orden de trabajo',
      }),
    });
    const salida1Data = await salida1.json();
    if (salida1.ok) {
      console.log(`      ✅ Movimiento creado. Stock: ${salida1Data.newStock || 'N/A'}\n`);
    } else {
      console.log(`      ❌ Error: ${salida1Data.error}\n`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Movimiento 4: Ingreso de 8 unidades a $550 c/u
    console.log('   📦 Ingreso 3: 8 unidades a $550 c/u');
    const ingreso3 = await fetch(`${BASE_URL}/repuestos/${repuestoId}/movimientos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipo: 'INGRESO',
        cantidad: 8,
        unitCost: 550,
        nota: 'Reabastecimiento - Proveedor A',
      }),
    });
    const ingreso3Data = await ingreso3.json();
    if (ingreso3.ok) {
      console.log(`      ✅ Movimiento creado. Stock: ${ingreso3Data.newStock || 'N/A'}\n`);
    } else {
      console.log(`      ❌ Error: ${ingreso3Data.error}\n`);
    }

    // -------------------------------------------------------------
    // 4️⃣ OBTENER RESUMEN DE INVENTARIO
    // -------------------------------------------------------------
    console.log('4️⃣ Obteniendo resumen de inventario...');
    const resumenRes = await fetch(`${BASE_URL}/kardex/resumen`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const resumenData = await resumenRes.json();

    if (resumenRes.ok) {
      console.log('✅ Resumen obtenido:');
      console.log(`   Total Repuestos: ${resumenData.data.totalRepuestos}`);
      console.log(`   Total Stock: ${resumenData.data.totalStock}`);
      console.log(`   Entradas Hoy: ${resumenData.data.totalEntradasHoy}`);
      console.log(`   Salidas Hoy: ${resumenData.data.totalSalidasHoy}`);
      console.log(`   Repuestos Bajo Stock: ${resumenData.data.repuestosBajoStock.length}\n`);
    } else {
      console.log('❌ Error:', resumenData);
    }

    // -------------------------------------------------------------
    // 5️⃣ OBTENER KARDEX COMPLETO
    // -------------------------------------------------------------
    console.log('5️⃣ Obteniendo kardex completo del repuesto...');
    const kardexRes = await fetch(`${BASE_URL}/kardex/${repuestoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const kardexData = await kardexRes.json();

    if (kardexRes.ok) {
      console.log('✅ Kardex completo obtenido:');
      console.log(`   Repuesto: ${kardexData.data.repuesto.nombre}`);
      console.log(`   Stock Actual: ${kardexData.data.repuesto.stockActual}`);
      console.log(`   Costo Promedio Actual: $${kardexData.data.repuesto.costoPromedioActual.toFixed(2)}`);
      console.log(`   Total Movimientos: ${kardexData.data.kardex.length}\n`);

      console.log('   📊 Detalle del Kardex:');
      kardexData.data.kardex.forEach((mov, index) => {
        console.log(`   ${index + 1}. [${mov.tipo}] ${mov.fecha}`);
        console.log(`      Stock Antes: ${mov.stockAntes} | Entrada: ${mov.entrada} | Salida: ${mov.salida} | Stock Después: ${mov.stockDespues}`);
        console.log(`      Costo Unit: $${mov.unitCost.toFixed(2)} | Subtotal: $${mov.subtotal.toFixed(2)} | CPP: $${mov.costoPromedio.toFixed(2)}`);
        console.log(`      Nota: ${mov.nota || 'N/A'}\n`);
      });
    } else {
      console.log('❌ Error:', kardexData);
    }

    // -------------------------------------------------------------
    // 6️⃣ OBTENER KARDEX FILTRADO POR FECHAS
    // -------------------------------------------------------------
    console.log('6️⃣ Obteniendo kardex filtrado por fechas (últimos 2 movimientos)...');
    
    // Obtener fecha de hace 1 hora y fecha actual
    const fechaHasta = new Date();
    const fechaDesde = new Date();
    fechaDesde.setHours(fechaDesde.getHours() - 1);

    const kardexFiltradoRes = await fetch(
      `${BASE_URL}/kardex/${repuestoId}/filtrado?desde=${fechaDesde.toISOString().split('T')[0]}&hasta=${fechaHasta.toISOString().split('T')[0]}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const kardexFiltradoData = await kardexFiltradoRes.json();

    if (kardexFiltradoRes.ok) {
      console.log('✅ Kardex filtrado obtenido:');
      console.log(`   Stock Base: ${kardexFiltradoData.data.filtros.stockBase}`);
      console.log(`   Costo Base: $${kardexFiltradoData.data.filtros.costoBase.toFixed(2)}`);
      console.log(`   Movimientos en rango: ${kardexFiltradoData.data.kardex.length}\n`);
    } else {
      console.log('⚠️  Kardex filtrado:', kardexFiltradoData);
    }

    // -------------------------------------------------------------
    // 7️⃣ VERIFICAR CÁLCULO CPP MANUAL
    // -------------------------------------------------------------
    console.log('7️⃣ Verificando cálculo CPP manual...');
    if (kardexRes.ok && kardexData.data.kardex.length > 0) {
      const ultimoMov = kardexData.data.kardex[kardexData.data.kardex.length - 1];
      console.log(`   Último CPP calculado: $${ultimoMov.costoPromedio.toFixed(2)}`);
      console.log(`   Stock final: ${ultimoMov.stockDespues}`);
      console.log(`   Debe coincidir con el costoPromedioActual del repuesto\n`);
    }

    console.log('🎉 Pruebas del módulo Kardex completadas exitosamente!');
  } catch (error) {
    console.error('🚨 Error durante las pruebas:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
})();

