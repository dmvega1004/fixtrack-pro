const clientesService = require('./clientes.service');

/**
 * Controlador de clientes
 * Maneja las peticiones HTTP relacionadas con clientes
 */
class ClientesController {
  /**
   * Lista todos los clientes de la empresa del usuario autenticado
   * GET /api/clientes
   */
  async listar(req, res, next) {
    try {
      const clientes = await clientesService.listarClientes(req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Clientes obtenidos exitosamente',
        data: clientes,
        count: clientes.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene un cliente por ID (solo de la misma empresa)
   * GET /api/clientes/:id
   */
  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const cliente = await clientesService.obtenerClientePorId(id, req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Cliente obtenido exitosamente',
        data: cliente,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crea un nuevo cliente en la empresa del usuario autenticado
   * POST /api/clientes
   */
  async crear(req, res, next) {
    try {
      const { nombre, contacto, telefono, direccion, email } = req.body;

      // Validación básica
      if (!nombre) {
        return res.status(400).json({
          success: false,
          error: 'El nombre del cliente es requerido',
        });
      }

      // Validar formato de email si se proporciona
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: 'Formato de email inválido',
          });
        }
      }

      // Crear cliente (empresaId se asigna automáticamente del req.user)
      const nuevoCliente = await clientesService.crearCliente(
        { nombre, contacto, telefono, direccion, email },
        req.user.empresaId // CRÍTICO: empresaId del usuario autenticado
      );

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: nuevoCliente,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza un cliente (solo de la misma empresa)
   * PUT /api/clientes/:id
   */
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nombre, contacto, telefono, direccion, email } = req.body;

      // Validar formato de email si se proporciona
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: 'Formato de email inválido',
          });
        }
      }

      const clienteActualizado = await clientesService.actualizarCliente(
        id,
        { nombre, contacto, telefono, direccion, email },
        req.user.empresaId // Filtro multi-tenant
      );

      res.status(200).json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: clienteActualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Elimina un cliente (solo de la misma empresa)
   * DELETE /api/clientes/:id
   */
  async eliminar(req, res, next) {
    try {
      const { id } = req.params;

      const resultado = await clientesService.eliminarCliente(
        id,
        req.user.empresaId // Filtro multi-tenant
      );

      res.status(200).json({
        success: true,
        message: 'Cliente eliminado exitosamente',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ClientesController();

