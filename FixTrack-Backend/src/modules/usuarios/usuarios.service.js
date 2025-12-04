const prisma = require('../../config/database');
const bcrypt = require('bcrypt');

/**
 * Servicio de usuarios
 * Maneja la lógica de negocio para CRUD de usuarios con multi-tenancy
 */
class UsuariosService {
  /**
   * Lista todos los usuarios de una empresa
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Array>} Lista de usuarios
   */
  async listarUsuarios(empresaId) {
    const usuarios = await prisma.usuario.findMany({
      where: {
        empresaId, // Filtro multi-tenant
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });

    return usuarios;
  }

  /**
   * Obtiene un usuario por ID (solo de la misma empresa)
   * @param {number} id - ID del usuario
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Usuario encontrado
   * @throws {Error} Si el usuario no existe o no pertenece a la empresa
   */
  async obtenerUsuarioPorId(id, empresaId) {
    const usuario = await prisma.usuario.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    });

    if (!usuario) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    return usuario;
  }

  /**
   * Crea un nuevo usuario en la empresa del admin
   * @param {Object} datosUsuario - Datos del usuario
   * @param {number} empresaId - ID de la empresa (asignado automáticamente)
   * @returns {Promise<Object>} Usuario creado
   * @throws {Error} Si el email ya existe
   */
  async crearUsuario(datosUsuario, empresaId) {
    const { nombre, email, password, rol, telefono } = datosUsuario;

    // Validar que el email no exista
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      const error = new Error('El email ya está registrado');
      error.status = 400;
      throw error;
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario (empresaId asignado automáticamente)
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hashedPassword,
        rol: rol || 'TECNICO',
        telefono,
        empresaId, // Asignado automáticamente del admin
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
        creadoEn: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    });

    return nuevoUsuario;
  }

  /**
   * Actualiza un usuario (solo de la misma empresa)
   * @param {number} id - ID del usuario
   * @param {Object} datosActualizacion - Datos a actualizar
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Usuario actualizado
   * @throws {Error} Si el usuario no existe o no pertenece a la empresa
   */
  async actualizarUsuario(id, datosActualizacion, empresaId) {
    const { nombre, email, password, rol, telefono, activo } = datosActualizacion;

    // Verificar que el usuario existe y pertenece a la empresa
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
    });

    if (!usuarioExistente) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    // Si se actualiza el email, verificar que no esté en uso por otro usuario
    if (email && email !== usuarioExistente.email) {
      const emailEnUso = await prisma.usuario.findUnique({
        where: { email },
      });

      if (emailEnUso) {
        const error = new Error('El email ya está registrado');
        error.status = 400;
        throw error;
      }
    }

    // Preparar datos de actualización
    const datosUpdate = {};
    if (nombre) datosUpdate.nombre = nombre;
    if (email) datosUpdate.email = email;
    if (rol) datosUpdate.rol = rol;
    if (telefono !== undefined) datosUpdate.telefono = telefono;
    if (activo !== undefined) datosUpdate.activo = activo;

    // Si se actualiza la contraseña, hashearla
    if (password) {
      datosUpdate.password = await bcrypt.hash(password, 10);
    }

    // Actualizar usuario
    const usuarioActualizado = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: datosUpdate,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    });

    return usuarioActualizado;
  }

  /**
   * Desactiva un usuario (soft delete)
   * @param {number} id - ID del usuario
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Usuario desactivado
   * @throws {Error} Si el usuario no existe o no pertenece a la empresa
   */
  async desactivarUsuario(id, empresaId) {
    // Verificar que el usuario existe y pertenece a la empresa
    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
    });

    if (!usuarioExistente) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }

    // Desactivar usuario (soft delete)
    const usuarioDesactivado = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: false },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        telefono: true,
        activo: true,
        creadoEn: true,
        actualizadoEn: true,
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
      },
    });

    return usuarioDesactivado;
  }
  async toggleEstado(id, activo, empresaId) {
  return await prisma.usuario.update({
    where: {
      id: parseInt(id),
      empresaId: parseInt(empresaId), // ← FILTRO MULTI-TENANT
    },
    data: { activo },
  })
}
}

module.exports = new UsuariosService();

