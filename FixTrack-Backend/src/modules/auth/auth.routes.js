// src/modules/auth/auth.routes.js → VERSIÓN FINAL 100% FUNCIONAL
const express = require('express')
const router = express.Router()
const authController = require('./auth.controller')
const authenticate = require('../../middlewares/authenticate') // ← IMPORT NECESARIO

// RUTAS PÚBLICAS (sin autenticación)
router.post('/login', authController.login.bind(authController))
router.post('/register', authController.register.bind(authController))

// RUTA PROTEGIDA: verificar token y devolver usuario
router.get('/me', authenticate, authController.getMe.bind(authController))

module.exports = router
