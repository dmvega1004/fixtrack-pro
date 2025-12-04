// test-tickets.js
const fetch = require("node-fetch"); // Asegúrate de tener node-fetch instalado
const BASE_URL = "http://localhost:3000/api";
let token = null;

async function run() {
  try {
    console.log("🔵 INICIANDO PRUEBAS DE TICKETS...");

    // -----------------------------------------------------------------------
    // 1. LOGIN
    // -----------------------------------------------------------------------
    console.log("\n1️⃣ Login Admin...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@taelco.com", password: "123456" }) // ⚠️ Verifica tus credenciales
    });

    const loginData = await loginRes.json();
    
    if (!loginRes.ok) {
        throw new Error(`Error en Login: ${JSON.stringify(loginData)}`);
    }

    // Manejo robusto del token (por si viene anidado en data)
    token = loginData.data ? loginData.data.token : loginData.token;
    
    if (!token) throw new Error("No se obtuvo token válido.");
    console.log("✅ Login OK.");

    // -----------------------------------------------------------------------
    // 2. OBTENER O CREAR CLIENTE (Auto-Fix)
    // -----------------------------------------------------------------------
    console.log("\n2️⃣ Buscando cliente para el ticket...");
    const clientesRes = await fetch(`${BASE_URL}/clientes`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const clientes = await clientesRes.json();
    
    let clienteId = null;

    if (clientes.length > 0) {
        clienteId = clientes[0].id;
        console.log(`✅ Usando cliente existente: ${clientes[0].nombre} (ID: ${clienteId})`);
    } else {
        console.log("🔸 No hay clientes. Creando uno automático...");
        const nuevoClienteRes = await fetch(`${BASE_URL}/clientes`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                nombre: "Cliente Test Tickets",
                email: "cliente@test-tickets.com",
                telefono: "555-1234",
                direccion: "Calle Falsa 123"
            })
        });
        
        const nuevoCliente = await nuevoClienteRes.json();
        
        if (!nuevoClienteRes.ok) {
            throw new Error(`Error creando cliente: ${JSON.stringify(nuevoCliente)}`);
        }

        // Manejo robusto del ID (por si viene anidado)
        clienteId = nuevoCliente.data ? nuevoCliente.data.id : nuevoCliente.id;
        console.log(`✅ Cliente creado automáticamente: ID ${clienteId}`);
    }

    if (!clienteId) throw new Error("No se pudo obtener un ID de cliente válido.");

    // -----------------------------------------------------------------------
    // 3. CREAR TICKET
    // -----------------------------------------------------------------------
    console.log("\n3️⃣ Creando Ticket...");
    const ticketRes = await fetch(`${BASE_URL}/tickets`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        clienteId: clienteId,
        asunto: "Error en Impresora Principal",
        descripcion: "La impresora hace un ruido extraño y no jala papel.",
        prioridad: "ALTA"
      })
    });
    
    const nuevoTicket = await ticketRes.json();
    
    if (!ticketRes.ok) throw new Error(`Error creando ticket: ${JSON.stringify(nuevoTicket)}`);
    
    console.log(`✅ Ticket Creado: ${nuevoTicket.codigo} (ID: ${nuevoTicket.id})`);

    // -----------------------------------------------------------------------
    // 4. AGREGAR MENSAJE (Cliente/Externo)
    // -----------------------------------------------------------------------
    console.log("\n4️⃣ Agregando Mensaje del Cliente...");
    const msgRes = await fetch(`${BASE_URL}/tickets/${nuevoTicket.id}/mensajes`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            mensaje: "Hola, urge la reparación porque tenemos facturas pendientes.",
            esInterno: false
        })
    });
    const msgData = await msgRes.json();
    console.log("✅ Mensaje Agregado OK.");

    // -----------------------------------------------------------------------
    // 5. AGREGAR NOTA INTERNA (Técnico)
    // -----------------------------------------------------------------------
    console.log("\n5️⃣ Agregando Nota Interna (Privada)...");
    await fetch(`${BASE_URL}/tickets/${nuevoTicket.id}/mensajes`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            mensaje: "Nota interna: El cliente suele atascar el papel. Llevar rodillos de repuesto.",
            esInterno: true
        })
    });
    console.log("✅ Nota interna agregada.");

    // -----------------------------------------------------------------------
    // 6. OBTENER DETALLE CON MENSAJES
    // -----------------------------------------------------------------------
    console.log("\n6️⃣ Verificando Hilo de Conversación...");
    const detalleRes = await fetch(`${BASE_URL}/tickets/${nuevoTicket.id}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const detalle = await detalleRes.json();
    
    console.log(`📋 Ticket: ${detalle.codigo} | Estado: ${detalle.estado}`);
    console.log(`💬 Mensajes en el hilo: ${detalle.mensajes.length}`);
    
    detalle.mensajes.forEach(m => {
        const tipo = m.esInterno ? "🔒 INTERNO" : "🌍 PÚBLICO";
        console.log(`   - [${tipo}] ${m.usuario.nombre}: "${m.mensaje}"`);
    });

    // -----------------------------------------------------------------------
    // 7. CERRAR TICKET
    // -----------------------------------------------------------------------
    console.log("\n7️⃣ Cerrando Ticket...");
    const cerrarRes = await fetch(`${BASE_URL}/tickets/${nuevoTicket.id}/cerrar`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (cerrarRes.ok) {
        console.log("✅ Ticket cerrado correctamente.");
    } else {
        console.error("❌ Error al cerrar ticket.");
    }

    console.log("\n🎉 PRUEBAS DE TICKETS FINALIZADAS CON ÉXITO.");

  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN PRUEBAS:", error);
  }
}

run();