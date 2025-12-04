// swagger-docs.js
//
// Servidor Express independiente para visualizar el archivo openapi.json
//

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");

const app = express();

// Ruta del archivo OpenAPI
const openapiPath = path.join(__dirname, "src", "docs", "openapi.json");

// Verificar que el archivo existe
if (!fs.existsSync(openapiPath)) {
  console.error("❌ ERROR: No se encontró el archivo openapi.json en src/docs/");
  process.exit(1);
}

// Cargar documento
const openapiDocument = JSON.parse(fs.readFileSync(openapiPath, "utf8"));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log("📘 Swagger UI disponible en:");
  console.log(`➡️  http://localhost:${PORT}/docs`);
});
