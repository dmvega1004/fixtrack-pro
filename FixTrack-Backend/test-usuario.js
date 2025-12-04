// test-usuario.js - Script para probar el CRUD de usuarios
async function probarCRUDUsuarios() {
  console.log("🔵 Iniciando pruebas de CRUD de Usuarios...\n");

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

    // 2. Listar usuarios existentes
    console.log("2️⃣ Listando usuarios existentes...");
    const listResponse = await fetch('http://localhost:3000/api/usuarios', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const listData = await listResponse.json();
    if (listResponse.ok) {
      console.log(`✅ Usuarios encontrados: ${listData.count}`);
      console.log("Usuarios:", JSON.stringify(listData.data, null, 2));
    } else {
      console.log("❌ Error al listar:", listData);
    }
    console.log("\n");

    // 3. Crear un nuevo usuario técnico
    console.log("3️⃣ Creando nuevo usuario técnico...");
    const createResponse = await fetch('http://localhost:3000/api/usuarios', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre: "Juan Pérez",
        email: "juan.perez@taelco.com",
        password: "123456",
        rol: "TECNICO",
        telefono: "+57 300 1234567"
      })
    });

    const createData = await createResponse.json();
    if (createResponse.ok) {
      console.log("✅ Usuario técnico creado exitosamente!");
      console.log("Datos:", JSON.stringify(createData.data, null, 2));
      const nuevoUsuarioId = createData.data.id;
      console.log("\n");

      // 4. Obtener el usuario creado por ID
      console.log(`4️⃣ Obteniendo usuario por ID: ${nuevoUsuarioId}...`);
      const getResponse = await fetch(`http://localhost:3000/api/usuarios/${nuevoUsuarioId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const getData = await getResponse.json();
      if (getResponse.ok) {
        console.log("✅ Usuario obtenido:");
        console.log(JSON.stringify(getData.data, null, 2));
      } else {
        console.log("❌ Error al obtener:", getData);
      }
      console.log("\n");

      // 5. Actualizar el usuario
      console.log("5️⃣ Actualizando usuario...");
      const updateResponse = await fetch(`http://localhost:3000/api/usuarios/${nuevoUsuarioId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: "Juan Carlos Pérez",
          telefono: "+57 300 9876543"
        })
      });

      const updateData = await updateResponse.json();
      if (updateResponse.ok) {
        console.log("✅ Usuario actualizado exitosamente!");
        console.log("Datos actualizados:", JSON.stringify(updateData.data, null, 2));
      } else {
        console.log("❌ Error al actualizar:", updateData);
      }
      console.log("\n");

      // 6. Listar usuarios nuevamente para verificar
      console.log("6️⃣ Listando usuarios después de crear...");
      const listResponse2 = await fetch('http://localhost:3000/api/usuarios', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const listData2 = await listResponse2.json();
      if (listResponse2.ok) {
        console.log(`✅ Total de usuarios: ${listData2.count}`);
        listData2.data.forEach((usuario, index) => {
          console.log(`   ${index + 1}. ${usuario.nombre} (${usuario.email}) - ${usuario.rol} - Activo: ${usuario.activo}`);
        });
      }
      console.log("\n");

      console.log("🎉 Pruebas de CRUD completadas exitosamente!");

    } else {
      console.log("❌ Error al crear usuario:", createData);
    }

  } catch (error) {
    console.error("🚨 Error de conexión:", error.message);
  }
}

probarCRUDUsuarios();

