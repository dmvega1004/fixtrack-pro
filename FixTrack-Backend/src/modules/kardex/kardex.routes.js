const express = require('express');
const kardexController = require('./kardex.controller');
const authenticate = require('../../middlewares/authenticate');

const router = express.Router();

/**
 * Rutas de Kardex
 * Base path: /api/kardex
 * Todas las rutas requieren autenticación
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/kardex/resumen - Resumen de inventario para dashboard
router.get('/resumen', kardexController.resumen.bind(kardexController));

// GET /api/kardex/:id/filtrado - Kardex filtrado por fechas
router.get('/:id/filtrado', kardexController.kardexFiltrado.bind(kardexController));

// GET /api/kardex/:id - Kardex completo o filtrado (si tiene query params desde/hasta)
router.get('/:id', kardexController.kardexPorRepuesto.bind(kardexController));

module.exports = router;

