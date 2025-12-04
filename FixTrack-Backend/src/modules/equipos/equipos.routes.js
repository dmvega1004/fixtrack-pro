const express = require('express');
const equiposController = require('./equipos.controller');
const authenticate = require('../../middlewares/authenticate');

const router = express.Router();

/**
 * Rutas de equipos
 * Base path: /api/equipos
 * Todas las rutas requieren autenticación
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/equipos - Listar equipos de mi empresa
router.get('/', equiposController.listar.bind(equiposController));

// GET /api/equipos/search/:qr - Buscar equipo por código QR
router.get('/search/:qr', equiposController.buscarPorQR.bind(equiposController));

// GET /api/equipos/:id - Ver detalle de un equipo
router.get('/:id', equiposController.obtenerPorId.bind(equiposController));

// POST /api/equipos - Crear equipo
router.post('/', equiposController.crear.bind(equiposController));

// PUT /api/equipos/:id - Editar equipo
router.put('/:id', equiposController.actualizar.bind(equiposController));

// DELETE /api/equipos/:id - Desactivar equipo (soft delete)
router.delete('/:id', equiposController.desactivar.bind(equiposController));

module.exports = router;

