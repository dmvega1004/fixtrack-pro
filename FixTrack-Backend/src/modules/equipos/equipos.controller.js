const equiposService = require('./equipos.service');

/**
 * Controlador de equipos
 * Maneja las peticiones HTTP relacionadas con equipos
 */
class EquiposController {
  /**
   * Lista todos los equipos de la empresa del usuario autenticado
   * GET /api/equipos
   */
  async listar(req, res, next) {
    try {
      const equipos = await equiposService.listarEquipos(req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Equipos obtenidos exitosamente',
        data: equipos,
        count: equipos.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene un equipo por ID (solo de la misma empresa)
   * GET /api/equipos/:id
   */
  async obtenerPorId(req, res, next) {
    try {
      const { id } = req.params;
      const equipo = await equiposService.obtenerEquipoPorId(id, req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Equipo obtenido exitosamente',
        data: equipo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca un equipo por código QR
   * GET /api/equipos/search/:qr
   */
  async buscarPorQR(req, res, next) {
    try {
      const { qr } = req.params;
      const equipo = await equiposService.buscarPorQR(qr, req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Equipo encontrado',
        data: equipo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crea un nuevo equipo en la empresa del usuario autenticado
   * POST /api/equipos
   */
  async crear(req, res, next) {
    try {
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
      } = req.body;

      // Validación básica
      if (!nombre || !tipoEquipoId || !clienteId) {
        return res.status(400).json({
          success: false,
          error: 'Nombre, tipoEquipoId y clienteId son requeridos',
        });
      }

      // Crear equipo (empresaId se asigna automáticamente del req.user)
      const nuevoEquipo = await equiposService.crearEquipo(
        {
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
        },
        req.user.empresaId // CRÍTICO: empresaId del usuario autenticado
      );

      res.status(201).json({
        success: true,
        message: 'Equipo creado exitosamente',
        data: nuevoEquipo,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Actualiza un equipo (solo de la misma empresa)
   * PUT /api/equipos/:id
   */
  async actualizar(req, res, next) {
    try {
      const { id } = req.params;
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
      } = req.body;

      const equipoActualizado = await equiposService.actualizarEquipo(
        id,
        {
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
        },
        req.user.empresaId // Filtro multi-tenant
      );

      res.status(200).json({
        success: true,
        message: 'Equipo actualizado exitosamente',
        data: equipoActualizado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Desactiva un equipo (soft delete)
   * DELETE /api/equipos/:id
   */
  async desactivar(req, res, next) {
    try {
      const { id } = req.params;

      const equipoDesactivado = await equiposService.desactivarEquipo(
        id,
        req.user.empresaId // Filtro multi-tenant
      );

      res.status(200).json({
        success: true,
        message: 'Equipo desactivado exitosamente',
        data: equipoDesactivado,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EquiposController();

