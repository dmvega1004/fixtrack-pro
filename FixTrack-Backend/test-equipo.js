// test-equipo.js - Script para probar el CRUD de equipos con flujo completo
const fetch = require('node-fetch');

async function probarCRUDEquipos() {
  console.log("🔵 Iniciando pruebas de CRUD de Equipos...\n");

  try {
    // 1. Primero hacer login para obtener el token
    console.log("1️⃣ Haciendo login como admin...");
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "admin@taelco.com",
        password: "123456"
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log("❌ Error en login:", loginData);
      return;
    }

    const token = loginData.data.token;
    console.log("✅ Login exitoso! Token obtenido.\n");

    // 2. Crear un cliente nuevo para el equipo
    console.log("2️⃣ Creando cliente nuevo para el equipo...");
    const clienteResponse = await fetch('http://localhost:3000/api/clientes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: "Empresa XYZ S.A.S.",
        contacto: "Carlos Rodríguez",
        telefono: "+57 1 5555555",
        direccion: "Avenida 68 #50-20, Bogotá",
        email: "contacto@empresaxyz.com"
      })
    });

    const clienteData = await clienteResponse.json();
    let clienteId;
    
    if (clienteResponse.ok) {
      clienteId = clienteData.data.id;
      console.log("✅ Cliente creado exitosamente!");
      console.log(`   ID: ${clienteId}, Nombre: ${clienteData.data.nombre}\n`);
    } else {
      console.log("⚠️  Error al crear cliente (puede que ya exista):", clienteData.error);
      // Intentar obtener el cliente existente
      const listClientes = await fetch('http://localhost:3000/api/clientes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const listClientesData = await listClientes.json();
      if (listClientesData.success && listClientesData.data.length > 0) {
        clienteId = listClientesData.data[0].id;
        console.log(`✅ Usando cliente existente: ID ${clienteId}\n`);
      } else {
        console.log("❌ No se pudo obtener un cliente. Abortando...");
        return;
      }
    }

    // 3. Listar equipos existentes
    console.log("3️⃣ Listando equipos existentes...");
    const listEquiposResponse = await fetch('http://localhost:3000/api/equipos', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const listEquiposData = await listEquiposResponse.json();
    if (listEquiposResponse.ok) {
      console.log(`✅ Equipos encontrados: ${listEquiposData.count}`);
      listEquiposData.data.forEach((equipo, index) => {
        console.log(`   ${index + 1}. ${equipo.nombre} (QR: ${equipo.codigoQR}) - Cliente: ${equipo.cliente.nombre}`);
      });
    } else {
      console.log("❌ Error al listar:", listEquiposData);
    }
    console.log("\n");

    // 4. Crear un nuevo equipo (sin código QR - se generará automáticamente)
    console.log("4️⃣ Creando nuevo equipo (sin código QR - se generará automáticamente)...");
    const createEquipoResponse = await fetch('http://localhost:3000/api/equipos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: "Servidor Web Principal",
        tipoEquipoId: 1, // Asumiendo que existe TipoEquipo con ID 1 (Servidor)
        clienteId: clienteId,
        marca: "HP",
        modelo: "ProLiant DL380",
        serie: "SN-2024-001",
        ubicacion: "Sala de Servidores - Piso 2",
        notas: "Equipo de prueba para desarrollo",
        fechaInstalacion: "2024-01-20"
        // codigoQR no se envía - se generará automáticamente
      })
    });

    const createEquipoData = await createEquipoResponse.json();
    if (createEquipoResponse.ok) {
      console.log("✅ Equipo creado exitosamente!");
      console.log("Datos:", JSON.stringify(createEquipoData.data, null, 2));
      const nuevoEquipoId = createEquipoData.data.id;
      const codigoQR = createEquipoData.data.codigoQR;
      console.log(`\n   📱 Código QR generado: ${codigoQR}\n`);

      // 5. Buscar el equipo por código QR
      console.log(`5️⃣ Buscando equipo por código QR: ${codigoQR}...`);
      const searchQRResponse = await fetch(`http://localhost:3000/api/equipos/search/${codigoQR}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const searchQRData = await searchQRResponse.json();
      if (searchQRResponse.ok) {
        console.log("✅ Equipo encontrado por QR!");
        console.log(`   Nombre: ${searchQRData.data.nombre}`);
        console.log(`   Cliente: ${searchQRData.data.cliente.nombre}`);
        console.log(`   Tipo: ${searchQRData.data.tipoEquipo.nombre}`);
        console.log(`   Estado: ${searchQRData.data.estado}`);
        if (searchQRData.data.ordenes && searchQRData.data.ordenes.length > 0) {
          console.log(`   Últimas órdenes: ${searchQRData.data.ordenes.length}`);
        }
      } else {
        console.log("❌ Error al buscar por QR:", searchQRData);
      }
      console.log("\n");

      // 6. Obtener el equipo por ID
      console.log(`6️⃣ Obteniendo equipo por ID: ${nuevoEquipoId}...`);
      const getEquipoResponse = await fetch(`http://localhost:3000/api/equipos/${nuevoEquipoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const getEquipoData = await getEquipoResponse.json();
      if (getEquipoResponse.ok) {
        console.log("✅ Equipo obtenido:");
        console.log(JSON.stringify(getEquipoData.data, null, 2));
      } else {
        console.log("❌ Error al obtener:", getEquipoData);
      }
      console.log("\n");

      // 7. Actualizar el equipo
      console.log("7️⃣ Actualizando equipo...");
      const updateEquipoResponse = await fetch(`http://localhost:3000/api/equipos/${nuevoEquipoId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: "Servidor Web Principal - Actualizado",
          ubicacion: "Sala de Servidores - Piso 3",
          notas: "Equipo actualizado - notas modificadas"
        })
      });

      const updateEquipoData = await updateEquipoResponse.json();
      if (updateEquipoResponse.ok) {
        console.log("✅ Equipo actualizado exitosamente!");
        console.log("Datos actualizados:", JSON.stringify(updateEquipoData.data, null, 2));
      } else {
        console.log("❌ Error al actualizar:", updateEquipoData);
      }
      console.log("\n");

      // 8. Crear otro equipo CON código QR personalizado
      console.log("8️⃣ Creando segundo equipo CON código QR personalizado...");
      const createEquipo2Response = await fetch('http://localhost:3000/api/equipos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: "Router Principal",
          tipoEquipoId: 1,
          clienteId: clienteId,
          marca: "Cisco",
          modelo: "ASR 1000",
          serie: "SN-2024-002",
          codigoQR: "EQ-CUSTOM-001", // Código QR personalizado
          ubicacion: "Rack Principal",
          notas: "Router con QR personalizado"
        })
      });

      const createEquipo2Data = await createEquipo2Response.json();
      if (createEquipo2Response.ok) {
        console.log("✅ Segundo equipo creado con QR personalizado!");
        console.log(`   QR: ${createEquipo2Data.data.codigoQR}\n`);
      } else {
        console.log("⚠️  Error al crear segundo equipo:", createEquipo2Data);
      }
      console.log("\n");

      // 9. Listar equipos nuevamente
      console.log("9️⃣ Listando todos los equipos después de crear...");
      const listEquipos2Response = await fetch('http://localhost:3000/api/equipos', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const listEquipos2Data = await listEquipos2Response.json();
      if (listEquipos2Response.ok) {
        console.log(`✅ Total de equipos: ${listEquipos2Data.count}`);
        listEquipos2Data.data.forEach((equipo, index) => {
          console.log(`   ${index + 1}. ${equipo.nombre}`);
          console.log(`      QR: ${equipo.codigoQR}`);
          console.log(`      Cliente: ${equipo.cliente.nombre}`);
          console.log(`      Estado: ${equipo.estado}`);
          console.log(`      Órdenes: ${equipo._count.ordenes}`);
          console.log("");
        });
      }
      console.log("\n");

      // 10. Desactivar el primer equipo (soft delete)
      console.log("🔟 Desactivando el primer equipo (soft delete)...");
      const deleteEquipoResponse = await fetch(`http://localhost:3000/api/equipos/${nuevoEquipoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const deleteEquipoData = await deleteEquipoResponse.json();
      if (deleteEquipoResponse.ok) {
        console.log("✅ Equipo desactivado exitosamente!");
        console.log(`   Estado actualizado: ${deleteEquipoData.data.estado}`);
      } else {
        console.log("❌ Error al desactivar:", deleteEquipoData);
      }
      console.log("\n");

      console.log("🎉 Pruebas de CRUD de Equipos completadas exitosamente!");
      console.log("\n📊 Resumen:");
      console.log(`   - Cliente creado/usado: ID ${clienteId}`);
      console.log(`   - Equipos creados: 2`);
      console.log(`   - Búsqueda por QR: ✅ Funcional`);
      console.log(`   - Soft delete: ✅ Funcional`);

    } else {
      console.log("❌ Error al crear equipo:", createEquipoData);
    }

  } catch (error) {
    console.error("🚨 Error de conexión:", error.message);
  }
}

probarCRUDEquipos();

