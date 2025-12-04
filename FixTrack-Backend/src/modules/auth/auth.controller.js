// src/modules/auth/auth.controller.js → VERSIÓN FINAL 100% FUNCIONAL
const authService = require('./auth.service')

class AuthController {
  // LOGIN
  async login(req, res, next) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email y contraseña son requeridos',
        })
      }

      const result = await authService.login(email, password)

      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: result.user.id,
            nombre: result.user.nombre,
            email: result.user.email,
            rol: result.user.rol,
            telefono: result.user.telefono,
            empresa: result.user.empresa,
          },
          token: result.token,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  // REGISTRO DE NUEVA EMPRESA + ADMIN
  async register(req, res) {
    try {
      const result = await authService.registerNewCompanyAndAdmin(req.body)
      
      res.status(201).json({
        success: true,
        message: result.message,
        data: result.data,
      })
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        error: error.message,
      })
    }
  }

  // GET /api/auth/me → DEVUELVE EL USUARIO AUTENTICADO
  async getMe(req, res) {
    try {
      const user = req.user // ← Viene del middleware authenticate

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            nombre: user.nombre || user.email.split('@')[0],
            email: user.email,
            rol: user.rol,
            empresaId: user.empresaId,
          },
        },
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      })
    }
  }
}

module.exports = new AuthController()