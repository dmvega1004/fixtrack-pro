// test-adjuntos.js – Pruebas del módulo de Adjuntos
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");

const BASE_URL = "http://localhost:3000/api";

async function request(pathUrl, options = {}) {
  const response = await fetch(`${BASE_URL}${pathUrl}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Error en la petición");
    error.data = data;
    throw error;
  }
  return data;
}

async function probarAdjuntos() {
  console.log("🔵 Iniciando pruebas del módulo de Adjuntos...\n");

  try {
    // 1. LOGIN
    console.log("1️⃣ Haciendo login como admin...");
    const loginResp = await request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@taelco.com",
        password: "123456",
      }),
    });

    const token = loginResp.data.token;
    const admin = loginResp.data.user;
    console.log("✅ Login exitoso.\n");

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Buscar una orden para asociar el archivo
    console.log("2️⃣ Buscando una orden existente...");
    const ordenes = await request("/ordenes?limit=1", {
      method: "GET",
      headers: authHeaders,
    });

    if (!ordenes.data || ordenes.data.length === 0) {
      console.log("❌ No hay órdenes creadas. Crea una antes de probar adjuntos.");
      return;
    }

    const ordenId = ordenes.data[0].id;
    console.log(`✅ Usando la orden ${ordenes.data[0].codigo} (ID ${ordenId})\n`);

    // 3. SUBIR UN ARCHIVO (imagen de prueba)
    console.log("3️⃣ Subiendo archivo de prueba...");

    const form = new FormData();
    const archivoPath = path.join(__dirname, "archivo_test.png");

    // Crea un archivo PNG temporal si no existe
    if (!fs.existsSync(archivoPath)) {
      fs.writeFileSync(archivoPath, "PNGTESTFILE");
    }

    form.append("archivo", fs.createReadStream(archivoPath));

    const subirResp = await fetch(`${BASE_URL}/adjuntos/${ordenId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    });

    const subirData = await subirResp.json();
    if (!subirResp.ok) throw new Error(subirData.error);

    const adjuntoId = subirData.data.id;
    console.log(`✅ Archivo subido correctamente (ID ${adjuntoId})\n`);

    // 4. LISTAR ADJUNTOS
    console.log("4️⃣ Listando adjuntos de la orden...");
    const lista = await request(`/adjuntos/${ordenId}`, {
      method: "GET",
      headers: authHeaders,
    });

    console.log(`✅ Total adjuntos encontrados: ${lista.data.length}`);
    lista.data.forEach((a) =>
      console.log(`   - ${a.id} | ${a.nombre} | ${a.url}`)
    );
    console.log("");

    // 5. ELIMINAR ADJUNTO
    console.log("5️⃣ Eliminando adjunto...");
    const eliminarResp = await request(`/adjuntos/${adjuntoId}`, {
      method: "DELETE",
      headers: authHeaders,
    });

    console.log(`✅ Adjunto eliminado: ${eliminarResp.message}\n`);

    // 6. Comprobar si el archivo físico se eliminó
    console.log("6️⃣ Verificando archivo físico...");

    const physicalPath = path.join(__dirname, "uploads", subirData.data.url);

    if (!fs.existsSync(physicalPath)) {
      console.log("🟢 Archivo FÍSICO eliminado correctamente.\n");
    } else {
      console.log("🔴 El archivo físico aún existe. Revisar adjuntos.service.js\n");
    }

    console.log("🎉 Pruebas del módulo de Adjuntos completadas con éxito.");

  } catch (error) {
    console.error("❌ Error en las pruebas:", error.message);
    if (error.data) {
      console.error("Detalles:", JSON.stringify(error.data, null, 2));
    }
  }
}

probarAdjuntos();
