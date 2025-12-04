const authService = require('../modules/auth/auth.service');

/**
 * Middleware de autenticación
 * Verifica el token JWT y agrega el usuario al request
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación requerido',
      });
    }

    // 2. Extraer token (formato: "Bearer <token>")
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticación inválido',
      });
    }

    // 3. Verificar y decodificar token
    const decoded = authService.verifyToken(token);

    // 4. Agregar información del usuario al request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol,
      empresaId: decoded.empresaId, // CRÍTICO para multi-tenancy
    };

    // 5. Continuar con el siguiente middleware
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      success: false,
      error: error.message || 'Error de autenticación',
    });
  }
};

module.exports = authenticate;

