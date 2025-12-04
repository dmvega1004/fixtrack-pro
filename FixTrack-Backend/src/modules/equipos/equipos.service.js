const prisma = require('../../config/database');

/**
 * Servicio de equipos
 * Maneja la lógica de negocio para CRUD de equipos con multi-tenancy
 */
class EquiposService {
  /**
   * Genera un código QR único para el equipo
   * @returns {string} Código QR único
   */
  generarCodigoQR() {
    // Formato: EQ-{UUID corto} o EQ-{timestamp}-{random}
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `EQ-${timestamp}-${random}`;
  }

  /**
   * Verifica que un cliente pertenezca a la empresa especificada
   * @param {number} clienteId - ID del cliente
   * @param {number} empresaId - ID de la empresa
   * @returns {Promise<boolean>} True si el cliente pertenece a la empresa
   * @throws {Error} Si el cliente no existe o no pertenece a la empresa
   */
  async validarClienteEmpresa(clienteId, empresaId) {
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: parseInt(clienteId),
        empresaId, // Filtro multi-tenant
      },
    });

    if (!cliente) {
      const error = new Error('Cliente no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }

    return true;
  }

  /**
   * Lista todos los equipos de una empresa
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Array>} Lista de equipos
   */
  async listarEquipos(empresaId) {
    const equipos = await prisma.equipo.findMany({
      where: {
        empresaId, // Filtro multi-tenant
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            email: true,
          },
        },
        tipoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });

    return equipos;
  }

  /**
   * Obtiene un equipo por ID (solo de la misma empresa)
   * @param {number} id - ID del equipo
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Equipo encontrado
   * @throws {Error} Si el equipo no existe o no pertenece a la empresa
   */
  async obtenerEquipoPorId(id, empresaId) {
    const equipo = await prisma.equipo.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            email: true,
            telefono: true,
          },
        },
        tipoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
    });

    if (!equipo) {
      const error = new Error('Equipo no encontrado');
      error.status = 404;
      throw error;
    }

    return equipo;
  }

  /**
   * Busca un equipo por código QR
   * @param {string} codigoQR - Código QR del equipo
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Equipo encontrado
   * @throws {Error} Si el equipo no existe o no pertenece a la empresa
   */
  async buscarPorQR(codigoQR, empresaId) {
    const equipo = await prisma.equipo.findFirst({
      where: {
        codigoQR,
        empresaId, // Filtro multi-tenant
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            email: true,
            telefono: true,
          },
        },
        tipoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        ordenes: {
          select: {
            id: true,
            codigo: true,
            tipo: true,
            estado: true,
            fechaInicio: true,
          },
          orderBy: {
            fechaInicio: 'desc',
          },
          take: 5, // Últimas 5 órdenes
        },
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
    });

    if (!equipo) {
      const error = new Error('Equipo no encontrado');
      error.status = 404;
      throw error;
    }

    return equipo;
  }

  /**
   * Crea un nuevo equipo en la empresa del usuario autenticado
   * @param {Object} datosEquipo - Datos del equipo
   * @param {number} empresaId - ID de la empresa (asignado automáticamente)
   * @returns {Promise<Object>} Equipo creado
   * @throws {Error} Si el cliente no existe o no pertenece a la empresa
   */
  async crearEquipo(datosEquipo, empresaId) {
    const {
      nombre,
      tipoEquipoId,
      clienteId,
      marca,
      modelo,
      serie,
      codigoQR,
      ubicacion,
      notas,
      fechaInstalacion,
    } = datosEquipo;

    // Validar que el cliente pertenece a la empresa
    await this.validarClienteEmpresa(clienteId, empresaId);

    // Generar código QR si no se proporciona
    let codigoQRFinal = codigoQR;
    if (!codigoQRFinal) {
      codigoQRFinal = this.generarCodigoQR();
      // Verificar que el código QR generado sea único
      let existeQR = true;
      while (existeQR) {
        const equipoExistente = await prisma.equipo.findUnique({
          where: { codigoQR: codigoQRFinal },
        });
        if (!equipoExistente) {
          existeQR = false;
        } else {
          codigoQRFinal = this.generarCodigoQR();
        }
      }
    } else {
      // Verificar que el código QR proporcionado sea único
      const equipoExistente = await prisma.equipo.findUnique({
        where: { codigoQR: codigoQRFinal },
      });
      if (equipoExistente) {
        const error = new Error('El código QR ya está en uso');
        error.status = 400;
        throw error;
      }
    }

    // Crear equipo (empresaId asignado automáticamente)
    const nuevoEquipo = await prisma.equipo.create({
      data: {
        nombre,
        tipoEquipoId: parseInt(tipoEquipoId),
        clienteId: parseInt(clienteId),
        marca,
        modelo,
        serie,
        codigoQR: codigoQRFinal,
        ubicacion,
        notas,
        fechaInstalacion: fechaInstalacion ? new Date(fechaInstalacion) : null,
        empresaId, // Asignado automáticamente del usuario autenticado
        estado: 'ACTIVO',
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            email: true,
          },
        },
        tipoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
    });

    return nuevoEquipo;
  }

  /**
   * Actualiza un equipo (solo de la misma empresa)
   * @param {number} id - ID del equipo
   * @param {Object} datosActualizacion - Datos a actualizar
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Equipo actualizado
   * @throws {Error} Si el equipo no existe o no pertenece a la empresa
   */
  async actualizarEquipo(id, datosActualizacion, empresaId) {
    const {
      nombre,
      tipoEquipoId,
      clienteId,
      marca,
      modelo,
      serie,
      codigoQR,
      ubicacion,
      notas,
      fechaInstalacion,
      estado,
    } = datosActualizacion;

    // Verificar que el equipo existe y pertenece a la empresa
    const equipoExistente = await prisma.equipo.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
    });

    if (!equipoExistente) {
      const error = new Error('Equipo no encontrado');
      error.status = 404;
      throw error;
    }

    // Si se actualiza el clienteId, validar que pertenece a la empresa
    if (clienteId && clienteId !== equipoExistente.clienteId) {
      await this.validarClienteEmpresa(clienteId, empresaId);
    }

    // Si se actualiza el código QR, verificar que sea único
    if (codigoQR && codigoQR !== equipoExistente.codigoQR) {
      const qrExistente = await prisma.equipo.findUnique({
        where: { codigoQR },
      });
      if (qrExistente) {
        const error = new Error('El código QR ya está en uso');
        error.status = 400;
        throw error;
      }
    }

    // Preparar datos de actualización
    const datosUpdate = {};
    if (nombre) datosUpdate.nombre = nombre;
    if (tipoEquipoId) datosUpdate.tipoEquipoId = parseInt(tipoEquipoId);
    if (clienteId) datosUpdate.clienteId = parseInt(clienteId);
    if (marca !== undefined) datosUpdate.marca = marca;
    if (modelo !== undefined) datosUpdate.modelo = modelo;
    if (serie !== undefined) datosUpdate.serie = serie;
    if (codigoQR) datosUpdate.codigoQR = codigoQR;
    if (ubicacion !== undefined) datosUpdate.ubicacion = ubicacion;
    if (notas !== undefined) datosUpdate.notas = notas;
    if (fechaInstalacion) datosUpdate.fechaInstalacion = new Date(fechaInstalacion);
    if (estado) datosUpdate.estado = estado;

    // Actualizar equipo
    const equipoActualizado = await prisma.equipo.update({
      where: { id: parseInt(id) },
      data: datosUpdate,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            email: true,
          },
        },
        tipoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
    });

    return equipoActualizado;
  }

  /**
   * Desactiva un equipo (soft delete)
   * @param {number} id - ID del equipo
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Equipo desactivado
   * @throws {Error} Si el equipo no existe o no pertenece a la empresa
   */
  async desactivarEquipo(id, empresaId) {
    // Verificar que el equipo existe y pertenece a la empresa
    const equipoExistente = await prisma.equipo.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
    });

    if (!equipoExistente) {
      const error = new Error('Equipo no encontrado');
      error.status = 404;
      throw error;
    }

    // Desactivar equipo (soft delete - cambiar estado a INACTIVO)
    const equipoDesactivado = await prisma.equipo.update({
      where: { id: parseInt(id) },
      data: { estado: 'INACTIVO' },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            email: true,
          },
        },
        tipoEquipo: {
          select: {
            id: true,
            nombre: true,
          },
        },
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            ordenes: true,
          },
        },
      },
    });

    return equipoDesactivado;
  }
}

module.exports = new EquiposService();

