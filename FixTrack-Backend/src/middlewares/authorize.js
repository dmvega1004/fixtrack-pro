// src/middleware/authorize.js
/**
 * Middleware de autorización por rol
 * Uso: router.post('/usuarios', authenticate, authorize('ADMIN'), controller.create)
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
      const userRole = req.user.rol
  
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'No tienes permisos para realizar esta acción',
        })
      }
      next()
    }
  }
  
  module.exports = authorize