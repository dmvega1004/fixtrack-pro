// src/modules/clientes/clientes.routes.js → VERSIÓN FINAL SEGURA
const express = require('express')
const clientesController = require('./clientes.controller')
const authenticate = require('../../middlewares/authenticate')
const authorize = require('../../middlewares/authorize')

const router = express.Router()

// TODAS las rutas requieren autenticación
router.use(authenticate)

// GET /api/clientes - Listar clientes (todos pueden ver)
router.get('/', clientesController.listar.bind(clientesController))

// GET /api/clientes/:id - Ver detalle (todos pueden ver)
router.get('/:id', clientesController.obtenerPorId.bind(clientesController))

// POST /api/clientes - Crear cliente (solo ADMIN y RECEPCION)
router.post('/', authorize('ADMIN', 'RECEPCION'), clientesController.crear.bind(clientesController))

// PUT /api/clientes/:id - Editar cliente (solo ADMIN y RECEPCION)
router.put('/:id', authorize('ADMIN', 'RECEPCION'), clientesController.actualizar.bind(clientesController))

// DELETE /api/clientes/:id - Eliminar cliente (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), clientesController.eliminar.bind(clientesController))

module.exports = router
