//--------------------------------------------------------------------
// TEST AUTOMÁTICO DEL MÓDULO DE MOVIMIENTOS DE REPUESTOS
//--------------------------------------------------------------------

const fetch = require("node-fetch");

const BASE_URL = "http://localhost:3000/api";
let token = null;

(async () => {
  try {
    console.log("🔵 Iniciando pruebas del módulo de Movimientos...\n");

    // -------------------------------------------------------------
    // 1️⃣ LOGIN COMO ADMIN
    // -------------------------------------------------------------
    console.log("1️⃣ Haciendo login...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@taelco.com",
        password: "123456"
      })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error("❌ Error al hacer login");

    token = loginData.data.token;
    console.log("✅ Login exitoso. Token obtenido.\n");

    // -------------------------------------------------------------
    // 2️⃣ BUSCAR O CREAR UN REPUESTO PARA LAS PRUEBAS
    // -------------------------------------------------------------
    console.log("2️⃣ Buscando repuestos existentes...");

    const repuestosRes = await fetch(`${BASE_URL}/repuestos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const repuestosData = await repuestosRes.json();
    // La respuesta del listar es { items: [...], total, page, limit }
    const repuestos = repuestosData.items || repuestosData.data || repuestosData;

    let repuestoId;

    if (repuestos && repuestos.length > 0) {
      repuestoId = repuestos[0].id;
      console.log(`✅ Usando repuesto existente: ${repuestos[0].nombre} (ID ${repuestoId})\n`);
    } else {
      console.log("🟡 No hay repuestos, creando uno nuevo...");

      const nuevoRes = await fetch(`${BASE_URL}/repuestos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: "Cable de Poder",
          descripcion: "Cable estándar",
          stock: 10, // Stock inicial para la prueba
          precioUnit: 15000
        })
      });
      
      const nuevo = await nuevoRes.json();
      
      // 🚨 CHEQUEO CRÍTICO: Si la creación falla, el servidor devuelve un error sin ID.
      if (!nuevoRes.ok) {
        console.error("❌ ERROR del servidor al crear repuesto:", nuevo);
        throw new Error("❌ Fallo en la creación del repuesto.");
      }
      
      // El servicio devuelve el objeto del repuesto directamente
      repuestoId = nuevo.id || nuevo.data?.id;
      
      // 🚨 SEGUNDO CHEQUEO: Si la ID sigue siendo undefined, algo está mal con el formato.
      if (!repuestoId) {
         console.error("❌ La respuesta de la API no contiene 'id'. Respuesta completa:", nuevo);
         throw new Error("❌ No se pudo capturar el ID del repuesto creado.");
      }

      console.log(`✅ Repuesto creado: Cable de Poder (ID ${repuestoId})\n`);
    }
    // Obtener stock inicial
    const infoRes = await fetch(`${BASE_URL}/repuestos/${repuestoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const repuestoInfo = await infoRes.json();

    let stockInicial = repuestoInfo.stock;
    console.log(`📦 Stock actual del repuesto: ${stockInicial}\n`);

    // -------------------------------------------------------------
    // 3️⃣ CREAR MOVIMIENTO DE ENTRADA (SUMA STOCK)
    // -------------------------------------------------------------
    console.log("3️⃣ Creando movimiento de ENTRADA...");

const entradaRes = await fetch(`${BASE_URL}/repuestos/${repuestoId}/movimientos`, { // ⬅️ CORREGIDO
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    repuestoId, // Aunque está en la URL, se recomienda enviarlo en el body también
    tipo: "INGRESO", // 🚨 CORRECCIÓN: El tipo en el service es 'INGRESO', no 'ENTRADA'
    cantidad: 5,
    nota: "Ingreso por compra"
  })
});

    const movEntrada = await entradaRes.json();
    if (!entradaRes.ok) {
      console.error("❌ Error del servidor:", movEntrada);
      throw new Error("❌ Error creando movimiento de ENTRADA");
    }

    const movimientoId = movEntrada.movimiento?.id || movEntrada.id;
    console.log(`✅ Movimiento registrado: INGRESO x5 (ID ${movimientoId})`);

    // Verificar stock aumentado
    const infoRes2 = await fetch(`${BASE_URL}/repuestos/${repuestoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const repuestoInfo2 = await infoRes2.json();

    const nuevoStock = movEntrada.newStock || repuestoInfo2.stock || repuestoInfo2.data?.stock;
    console.log(`📈 Stock después de INGRESO: ${nuevoStock}\n`);

    // -------------------------------------------------------------
    // 4️⃣ CREAR MOVIMIENTO DE SALIDA (RESTA STOCK)
    // -------------------------------------------------------------
    console.log("4️⃣ Creando movimiento de SALIDA...");

    const salidaRes = await fetch(`${BASE_URL}/repuestos/${repuestoId}/movimientos`, { // ⬅️ URL CORREGIDA
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        repuestoId,
        tipo: "SALIDA", // Correcto
        cantidad: 2,
        nota: "Salida para mantenimiento"
      })
    });
    
    const movSalida = await salidaRes.json();
    
    if (!salidaRes.ok) {
        // Si falla, mostramos el error del servidor
        console.error("❌ Respuesta de error:", movSalida);
        throw new Error("❌ Error creando movimiento de SALIDA");
    }
    
    // 🚨 CORRECCIÓN DE ESTRUCTURA: El ID viene dentro de 'movimiento'
    console.log(`✅ Movimiento registrado: SALIDA x2 (ID ${movSalida.movimiento.id})`);
    
    // Verificar stock disminuido
    const infoRes3 = await fetch(`${BASE_URL}/repuestos/${repuestoId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const repuestoInfo3 = await infoRes3.json();
    
    console.log(`📉 Stock después de SALIDA: ${repuestoInfo3.stock}\n`);

    // -------------------------------------------------------------
    // 5️⃣ LISTAR MOVIMIENTOS
    // -------------------------------------------------------------
    console.log("5️⃣ Listando movimientos...");

    const listaRes = await fetch(`${BASE_URL}/movimientos`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const lista = await listaRes.json();
    console.log(`✅ Movimientos encontrados: ${lista.length}`);

    lista.forEach(m => {
      console.log(`   - [${m.tipo}] Cant: ${m.cantidad} / Repuesto: ${m.repuesto.nombre}`);
    });

    console.log("");

    // -------------------------------------------------------------
    // 6️⃣ DETALLE DE UN MOVIMIENTO
    // -------------------------------------------------------------
    console.log("6️⃣ Obteniendo detalle del primer movimiento...");

    const detalleId = lista[0].id;

    const detalleRes = await fetch(`${BASE_URL}/movimientos/${detalleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const detalle = await detalleRes.json();

    console.log(`✅ Detalle de movimiento ID ${detalleId}:`);
    console.log(`   Tipo: ${detalle.tipo}`);
    console.log(`   Repuesto: ${detalle.repuesto.nombre}`);
    console.log(`   Cantidad: ${detalle.cantidad}\n`);

    console.log("🎉 Pruebas del módulo de Movimientos completadas con éxito.\n");

  } catch (error) {
    console.error("❌ Error durante las pruebas:", error);
  }
})();
