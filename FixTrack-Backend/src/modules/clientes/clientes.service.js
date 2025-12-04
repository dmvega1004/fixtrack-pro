const prisma = require('../../config/database');

/**
 * Servicio de clientes
 * Maneja la lógica de negocio para CRUD de clientes con multi-tenancy
 */
class ClientesService {
  /**
   * Lista todos los clientes de una empresa
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Array>} Lista de clientes
   */
  async listarClientes(empresaId) {
    const clientes = await prisma.cliente.findMany({
      where: {
        empresaId, // Filtro multi-tenant
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            equipos: true,
            ordenes: true,
            tickets: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'desc',
      },
    });

    return clientes;
  }

  /**
   * Obtiene un cliente por ID (solo de la misma empresa)
   * @param {number} id - ID del cliente
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Cliente encontrado
   * @throws {Error} Si el cliente no existe o no pertenece a la empresa
   */
  async obtenerClientePorId(id, empresaId) {
    const cliente = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            equipos: true,
            ordenes: true,
            tickets: true,
          },
        },
      },
    });

    if (!cliente) {
      const error = new Error('Cliente no encontrado');
      error.status = 404;
      throw error;
    }

    return cliente;
  }

  /**
   * Crea un nuevo cliente en la empresa del usuario autenticado
   * @param {Object} datosCliente - Datos del cliente
   * @param {number} empresaId - ID de la empresa (asignado automáticamente)
   * @returns {Promise<Object>} Cliente creado
   */
  async crearCliente(datosCliente, empresaId) {
    const { nombre, contacto, telefono, direccion, email } = datosCliente;

    // Crear cliente (empresaId asignado automáticamente)
    const nuevoCliente = await prisma.cliente.create({
      data: {
        nombre,
        contacto,
        telefono,
        direccion,
        email,
        empresaId, // Asignado automáticamente del usuario autenticado
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            equipos: true,
            ordenes: true,
            tickets: true,
          },
        },
      },
    });

    return nuevoCliente;
  }

  /**
   * Actualiza un cliente (solo de la misma empresa)
   * @param {number} id - ID del cliente
   * @param {Object} datosActualizacion - Datos a actualizar
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Cliente actualizado
   * @throws {Error} Si el cliente no existe o no pertenece a la empresa
   */
  async actualizarCliente(id, datosActualizacion, empresaId) {
    const { nombre, contacto, telefono, direccion, email } = datosActualizacion;

    // Verificar que el cliente existe y pertenece a la empresa
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
    });

    if (!clienteExistente) {
      const error = new Error('Cliente no encontrado');
      error.status = 404;
      throw error;
    }

    // Preparar datos de actualización
    const datosUpdate = {};
    if (nombre) datosUpdate.nombre = nombre;
    if (contacto !== undefined) datosUpdate.contacto = contacto;
    if (telefono !== undefined) datosUpdate.telefono = telefono;
    if (direccion !== undefined) datosUpdate.direccion = direccion;
    if (email !== undefined) datosUpdate.email = email;

    // Actualizar cliente
    const clienteActualizado = await prisma.cliente.update({
      where: { id: parseInt(id) },
      data: datosUpdate,
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            nit: true,
          },
        },
        _count: {
          select: {
            equipos: true,
            ordenes: true,
            tickets: true,
          },
        },
      },
    });

    return clienteActualizado;
  }

  /**
   * Elimina un cliente (solo de la misma empresa)
   * @param {number} id - ID del cliente
   * @param {number} empresaId - ID de la empresa (multi-tenant)
   * @returns {Promise<Object>} Cliente eliminado
   * @throws {Error} Si el cliente no existe, no pertenece a la empresa o tiene relaciones
   */
  async eliminarCliente(id, empresaId) {
    // Verificar que el cliente existe y pertenece a la empresa
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        id: parseInt(id),
        empresaId, // Filtro multi-tenant
      },
      include: {
        _count: {
          select: {
            equipos: true,
            ordenes: true,
            tickets: true,
          },
        },
      },
    });

    if (!clienteExistente) {
      const error = new Error('Cliente no encontrado');
      error.status = 404;
      throw error;
    }

    // Verificar si tiene relaciones (equipos, órdenes, tickets)
    const tieneRelaciones =
      clienteExistente._count.equipos > 0 ||
      clienteExistente._count.ordenes > 0 ||
      clienteExistente._count.tickets > 0;

    if (tieneRelaciones) {
      const error = new Error(
        'No se puede eliminar el cliente porque tiene equipos, órdenes o tickets asociados'
      );
      error.status = 400;
      throw error;
    }

    // Eliminar cliente
    await prisma.cliente.delete({
      where: { id: parseInt(id) },
    });

    return { id: parseInt(id), eliminado: true };
  }
}

module.exports = new ClientesService();

