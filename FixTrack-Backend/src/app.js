const express = require('express');
const cors = require('cors');
const config = require('./config/env');

const app = express();

// Middlewares básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FixTrack Pro API is running',
    timestamp: new Date().toISOString(),
  });
});

// Rutas API
const authRoutes = require('./modules/auth/auth.routes');
app.use('/api/auth', authRoutes);

const usuariosRoutes = require('./modules/usuarios/usuarios.routes');
app.use('/api/usuarios', usuariosRoutes);

const clientesRoutes = require('./modules/clientes/clientes.routes');
app.use('/api/clientes', clientesRoutes);

const equiposRoutes = require('./modules/equipos/equipos.routes');
app.use('/api/equipos', equiposRoutes);

const ordenesRoutes = require('./modules/ordenes/ordenes.routes');
app.use('/api/ordenes', ordenesRoutes);

const movimientosRoutes = require("./modules/movimientos/movimientos.routes");
app.use('/api/movimientos', movimientosRoutes);

const repuestosRoutes = require("./modules/repuestos/repuestos.routes");
app.use("/api/repuestos", repuestosRoutes);

const kardexRoutes = require('./modules/kardex/kardex.routes');
app.use('/api/kardex', kardexRoutes);

const adjuntosRoutes = require("./modules/adjuntos/adjuntos.routes")
app.use("/api/adjuntos", adjuntosRoutes);

const ticketsRoutes = require("./modules/tickets/tickets.routes");
app.use("/api/tickets",ticketsRoutes);

const configRoutes = require("./modules/configuracion/config.routes");
app.use("/api/config",configRoutes);

const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
app.use("/api/dashboard", dashboardRoutes);

// Rutas API (se agregarán en los siguientes pasos)
// app.use('/api/empresas', empresaRoutes);
// app.use('/api/repuestos', repuestoRoutes);
// app.use('/api/adjuntos', adjuntoRoutes);
// app.use('/api/tickets', ticketRoutes);

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;

