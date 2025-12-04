// test-config.js
const fetch = require("node-fetch");
const BASE_URL = "http://localhost:3000/api";
let token = null;

async function run() {
  try {
    console.log("🔵 INICIANDO PRUEBAS DE CONFIGURACIÓN...");

    // 1. LOGIN
    console.log("\n1️⃣ Login...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@taelco.com", password: "123456" })
    });
    const loginData = await loginRes.json();
    token = loginData.data ? loginData.data.token : loginData.token;
    if (!token) throw new Error("Fallo Login");
    console.log("✅ Login OK.");

    // 2. CREAR ITEM EN CATÁLOGO (MARCA)
    console.log("\n2️⃣ Creando Marcas de Equipo...");
    await fetch(`${BASE_URL}/config/catalogos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tipo: "MARCA_EQUIPO", valor: "Dell", descripcion: "Equipos Dell" })
    });
    await fetch(`${BASE_URL}/config/catalogos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tipo: "MARCA_EQUIPO", valor: "HP", descripcion: "Equipos HP" })
      });
    console.log("✅ Marcas creadas.");

    // 3. LISTAR CATÁLOGO
    console.log("\n3️⃣ Listando Marcas...");
    const catRes = await fetch(`${BASE_URL}/config/catalogos/MARCA_EQUIPO`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const marcas = await catRes.json();
    console.log("📋 Marcas encontradas:", marcas.map(m => m.valor).join(", "));

    // 4. GUARDAR CONFIGURACIÓN GLOBAL
    console.log("\n4️⃣ Configurando Variables Globales...");
    await fetch(`${BASE_URL}/config/global`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clave: "IVA", valor: "19", descripcion: "Impuesto al valor agregado" })
    });
    console.log("✅ IVA configurado al 19%.");

    // 5. OBTENER CONFIGURACIÓN
    console.log("\n5️⃣ Leyendo Configuración Global...");
    const confRes = await fetch(`${BASE_URL}/config/global`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const configs = await confRes.json();
    console.log("⚙️ Configuración actual:", configs);

    console.log("\n🎉 PRUEBAS DE CONFIGURACIÓN EXITOSAS.");

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
}

run();