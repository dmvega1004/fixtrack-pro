// test-login.js
async function probarLogin() {
    console.log("🔵 Intentando iniciar sesión...");
  
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "admin@taelco.com",
          password: "123456" // La contraseña del seed
        })
      });
  
      const data = await response.json();
  
      if (response.ok) {
        console.log("✅ LOGIN EXITOSO!");
        console.log("📋 Respuesta completa:", JSON.stringify(data, null, 2));
        console.log("\n🔑 Tu Token es:", data.data?.token);
        console.log("👤 Datos Usuario:", JSON.stringify(data.data?.user, null, 2));
      } else {
        console.log("❌ ERROR:", JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error("🚨 Error de conexión:", error.message);
    }
  }
  
  probarLogin();