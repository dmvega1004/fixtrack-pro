// test-cliente.js - Script para probar el CRUD de clientes
async function probarCRUDClientes() {
  console.log("🔵 Iniciando pruebas de CRUD de Clientes...\n");

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

    // 2. Listar clientes existentes
    console.log("2️⃣ Listando clientes existentes...");
    const listResponse = await fetch('http://localhost:3000/api/clientes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const listData = await listResponse.json();
    if (listResponse.ok) {
      console.log(`✅ Clientes encontrados: ${listData.count}`);
      listData.data.forEach((cliente, index) => {
        console.log(`   ${index + 1}. ${cliente.nombre} - Equipos: ${cliente._count.equipos}, Órdenes: ${cliente._count.ordenes}`);
      });
    } else {
      console.log("❌ Error al listar:", listData);
    }
    console.log("\n");

    // 3. Crear un nuevo cliente
    console.log("3️⃣ Creando nuevo cliente...");
    const createResponse = await fetch('http://localhost:3000/api/clientes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: "Empresa ABC S.A.S.",
        contacto: "María González",
        telefono: "+57 1 2345678",
        direccion: "Calle 100 #50-30, Bogotá",
        email: "contacto@empresaabc.com"
      })
    });

    const createData = await createResponse.json();
    if (createResponse.ok) {
      console.log("✅ Cliente creado exitosamente!");
      console.log("Datos:", JSON.stringify(createData.data, null, 2));
      const nuevoClienteId = createData.data.id;
      console.log("\n");

      // 4. Obtener el cliente creado por ID
      console.log(`4️⃣ Obteniendo cliente por ID: ${nuevoClienteId}...`);
      const getResponse = await fetch(`http://localhost:3000/api/clientes/${nuevoClienteId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const getData = await getResponse.json();
      if (getResponse.ok) {
        console.log("✅ Cliente obtenido:");
        console.log(JSON.stringify(getData.data, null, 2));
      } else {
        console.log("❌ Error al obtener:", getData);
      }
      console.log("\n");

      // 5. Actualizar el cliente
      console.log("5️⃣ Actualizando cliente...");
      const updateResponse = await fetch(`http://localhost:3000/api/clientes/${nuevoClienteId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: "Empresa ABC S.A.S. - Actualizada",
          contacto: "María González",
          telefono: "+57 1 9876543",
          direccion: "Calle 200 #60-40, Medellín"
        })
      });

      const updateData = await updateResponse.json();
      if (updateResponse.ok) {
        console.log("✅ Cliente actualizado exitosamente!");
        console.log("Datos actualizados:", JSON.stringify(updateData.data, null, 2));
      } else {
        console.log("❌ Error al actualizar:", updateData);
      }
      console.log("\n");

      // 6. Listar clientes nuevamente para verificar
      console.log("6️⃣ Listando clientes después de crear...");
      const listResponse2 = await fetch('http://localhost:3000/api/clientes', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const listData2 = await listResponse2.json();
      if (listResponse2.ok) {
        console.log(`✅ Total de clientes: ${listData2.count}`);
        listData2.data.forEach((cliente, index) => {
          console.log(`   ${index + 1}. ${cliente.nombre} - Contacto: ${cliente.contacto || 'N/A'} - Equipos: ${cliente._count.equipos}`);
        });
      }
      console.log("\n");

      // 7. Intentar eliminar el cliente (solo si no tiene relaciones)
      console.log("7️⃣ Intentando eliminar cliente...");
      const deleteResponse = await fetch(`http://localhost:3000/api/clientes/${nuevoClienteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const deleteData = await deleteResponse.json();
      if (deleteResponse.ok) {
        console.log("✅ Cliente eliminado exitosamente!");
        console.log("Resultado:", JSON.stringify(deleteData.data, null, 2));
      } else {
        console.log("⚠️  No se pudo eliminar (probablemente tiene relaciones):");
        console.log(JSON.stringify(deleteData, null, 2));
      }
      console.log("\n");

      console.log("🎉 Pruebas de CRUD completadas exitosamente!");

    } else {
      console.log("❌ Error al crear cliente:", createData);
    }

  } catch (error) {
    console.error("🚨 Error de conexión:", error.message);
  }
}

probarCRUDClientes();

