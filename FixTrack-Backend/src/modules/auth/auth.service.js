// src/modules/auth/auth.service.js → VERSIÓN FINAL QUE FUNCIONA
const prisma = require('../../config/database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const config = require('../../config/env')

class AuthService {
  async login(email, password) {
    const user = await prisma.usuario.findUnique({
      where: { email },
      include: { empresa: { select: { id: true, nombre: true } } },
    })

    if (!user || !user.activo) {
      const error = new Error('Credenciales inválidas')
      error.status = 401
      throw error
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      const error = new Error('Credenciales inválidas')
      error.status = 401
      throw error
    }

    const payload = {
      id: user.id,
      email: user.email,
      rol: user.rol,
      empresaId: user.empresaId,
    }

    const token = jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' })

    const { password: _, ...userWithoutPassword } = user

    return {
      user: {
        ...userWithoutPassword,
        empresa: user.empresa,
      },
      token,
    }
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET)
    } catch (error) {
      const err = new Error('Token inválido o expirado')
      err.status = 401
      throw err
    }
  }
}

module.exports = new AuthService()  // ← ESTO ES CLAVE