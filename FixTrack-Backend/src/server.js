require('dotenv').config();
const app = require('./app');
const config = require('./config/env');
const prisma = require('./config/database');

const PORT = config.PORT || 3000;

// Función para iniciar el servidor
async function startServer() {
  try {
    // Verificar conexión a la base de datos
    await prisma.$connect();
    console.log('✅ Database connection established');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 FixTrack Pro server running on port ${PORT}`);
      console.log(`📍 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n⏹️  Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏹️  Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

// Iniciar servidor
startServer();

