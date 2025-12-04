// src/modules/usuarios/usuarios.routes.js → VERSIÓN FINAL DEFINITIVA
const express = require('express')
const usuariosController = require('./usuarios.controller')
const authenticate = require('../../middlewares/authenticate')
const authorize = require('../../middlewares/authorize')

const router = express.Router()

// TODAS las rutas requieren autenticación
router.use(authenticate)

// LISTAR y DETALLE (todos pueden ver)
router.get('/', usuariosController.listar.bind(usuariosController))
router.get('/:id', usuariosController.obtenerPorId.bind(usuariosController))

// CREAR (solo ADMIN)
router.post('/', authorize('ADMIN'), usuariosController.crear.bind(usuariosController))

// EDITAR (solo ADMIN)
router.patch('/:id', authorize('ADMIN'), usuariosController.actualizar.bind(usuariosController))

// DESACTIVAR (solo ADMIN)
router.delete('/:id', authorize('ADMIN'), usuariosController.desactivar.bind(usuariosController))

// ACTIVAR/DESACTIVAR ESTADO (solo ADMIN)
router.patch('/:id/estado', authorize('ADMIN'), usuariosController.toggleEstado.bind(usuariosController))

module.exports = router