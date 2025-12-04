
// src/modules/usuarios/usuarios.controller.js → VERSIÓN FINAL DEFINITIVA
const usuariosService = require('./usuarios.service')

class UsuariosController {
  async listar(req, res, next) {
    try {
      const usuarios = await usuariosService.listarUsuarios(req.user.empresaId)

      res.status(200).json({
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: usuarios,
        count: usuarios.length,
      })
    } catch (error) {
      next(error)
    }
  }

  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params
      const usuario = await usuariosService.obtenerUsuarioPorId(id, req.user.empresaId)

      res.status(200).json({
        success: true,
        message: 'Usuario obtenido exitosamente',
        data: usuario,
      })
    } catch (error) {
      next(error)
    }
  }

  async crear(req, res, next) {
    try {
      const { nombre, email, password, rol, telefono } = req.body

      if (!nombre || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Nombre, email y contraseña son requeridos',
        })
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Formato de email inválido',
        })
      }

      const rolesValidos = ['ADMIN', 'TECNICO', 'RECEPCION', 'CONTABILIDAD']
      if (rol && !rolesValidos.includes(rol)) {
        return res.status(400).json({
          success: false,
          error: `Rol inválido. Roles válidos: ${rolesValidos.join(', ')}`,
        })
      }

      const nuevoUsuario = await usuariosService.crearUsuario(
        { nombre, email, password, rol, telefono },
        req.user.empresaId
      )

      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: nuevoUsuario,
      })
    } catch (error) {
      next(error)
    }
  }

  async actualizar(req, res, next) {
    try {
      const { id } = req.params
      const { nombre, email, password, rol, telefono, activo } = req.body

      if (rol) {
        const rolesValidos = ['ADMIN', 'TECNICO', 'RECEPCION', 'CONTABILIDAD']
        if (!rolesValidos.includes(rol)) {
          return res.status(400).json({
            success: false,
            error: `Rol inválido. Roles válidos: ${rolesValidos.join(', ')}`,
          })
        }
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: 'Formato de email inválido',
          })
        }
      }

      const usuarioActualizado = await usuariosService.actualizarUsuario(
        id,
        { nombre, email, password, rol, telefono, activo },
        req.user.empresaId
      )

      res.status(200).json({
        success: true,
        message: 'Usuario actualizado exitosamente',
        data: usuarioActualizado,
      })
    } catch (error) {
      next(error)
    }
  }

  async desactivar(req, res, next) {
    try {
      const { id } = req.params

      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'No puedes desactivar tu propia cuenta',
        })
      }

      const usuarioDesactivado = await usuariosService.desactivarUsuario(id, req.user.empresaId)

      res.status(200).json({
        success: true,
        message: 'Usuario desactivado exitosamente',
        data: usuarioDesactivado,
      })
    } catch (error) {
      next(error)
    }
  }

  // NUEVA FUNCIÓN: toggleEstado (más simple y profesional)
  async toggleEstado(req, res) {
    try {
      const { id } = req.params
      const { activo } = req.body
      const empresaId = req.user.empresaId // ← CLAVE: multi-tenant

const usuario = await usuariosService.toggleEstado(parseInt(id), activo, empresaId)

      res.json({
        success: true,
        message: activo ? 'Usuario activado' : 'Usuario desactivado',
        data: usuario,
      })
    } catch (error) {
    console.error('Error toggleEstado:', error)
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Error al cambiar estado del usuario',
      })
    }
  }
}

module.exports = new UsuariosController()