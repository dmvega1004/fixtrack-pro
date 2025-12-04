// src/modules/ordenes/ordenes.routes.js → VERSIÓN FINAL SEGURA
const express = require('express')
const ordenesController = require('./ordenes.controller')
const authenticate = require('../../middlewares/authenticate')
const authorize = require('../../middlewares/authorize')

const router = express.Router()

// TODAS las rutas requieren autenticación
router.use(authenticate)

// LISTAR órdenes (todos pueden ver las de su empresa)
router.get('/', ordenesController.listar.bind(ordenesController))

// DETALLE de orden (todos pueden ver)
router.get('/:id', ordenesController.obtenerPorId.bind(ordenesController))

// CREAR orden (ADMIN, RECEPCION y TÉCNICO pueden crear)
router.post(
  '/',
  authorize('ADMIN', 'RECEPCION', 'TECNICO'),
  ordenesController.crear.bind(ordenesController)
)

// ACTUALIZAR orden completa (solo ADMIN y TÉCNICO asignado)
router.put(
  '/:id',
  authorize('ADMIN', 'TECNICO'),
  ordenesController.actualizar.bind(ordenesController)
)

// CAMBIAR ESTADO (ADMIN y TÉCNICO asignado)
router.patch(
  '/:id/estado',
  authorize('ADMIN', 'TECNICO'),
  ordenesController.cambiarEstado.bind(ordenesController)
)

// ASIGNAR TÉCNICO (solo ADMIN y RECEPCION)
router.patch(
  '/:id/asignar',
  authorize('ADMIN', 'RECEPCION'),
  ordenesController.asignarTecnico.bind(ordenesController)
)

// AGREGAR/Quitar repuestos (solo ADMIN y TÉCNICO asignado)
router.post(
  '/:id/repuestos',
  authorize('ADMIN', 'TECNICO'),
  ordenesController.agregarRepuesto.bind(ordenesController)
)

router.delete(
  '/:id/repuestos/:itemId',
  authorize('ADMIN', 'TECNICO'),
  ordenesController.quitarRepuesto.bind(ordenesController)
)

module.exports = router
