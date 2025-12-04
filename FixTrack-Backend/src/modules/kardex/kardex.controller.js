const kardexService = require('./kardex.service');

/**
 * Controlador de Kardex
 * Maneja las peticiones HTTP relacionadas con kardex contable
 */
class KardexController {
  /**
   * Obtiene el resumen de inventario para el dashboard
   * GET /api/kardex/resumen
   */
  async resumen(req, res, next) {
    try {
      const resumen = await kardexService.obtenerResumen(req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Resumen de inventario obtenido exitosamente',
        data: resumen,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el kardex completo de un repuesto
   * GET /api/kardex/:id
   */
  async kardexPorRepuesto(req, res, next) {
    try {
      const { id } = req.params;
      const { desde, hasta } = req.query;

      // Si hay filtros de fecha, usar el método filtrado
      if (desde && hasta) {
        const fechaDesde = new Date(desde);
        const fechaHasta = new Date(hasta);
        fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día hasta

        const kardex = await kardexService.obtenerKardexFiltrado(
          id,
          req.user.empresaId,
          fechaDesde,
          fechaHasta
        );

        return res.status(200).json({
          success: true,
          message: 'Kardex filtrado obtenido exitosamente',
          data: kardex,
        });
      }

      // Si no hay filtros, obtener kardex completo
      const kardex = await kardexService.obtenerKardexPorRepuesto(
        id,
        req.user.empresaId
      );

      res.status(200).json({
        success: true,
        message: 'Kardex obtenido exitosamente',
        data: kardex,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtiene el kardex filtrado por fechas
   * GET /api/kardex/:id/filtrado?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
   */
  async kardexFiltrado(req, res, next) {
    try {
      const { id } = req.params;
      const { desde, hasta } = req.query;

      if (!desde || !hasta) {
        return res.status(400).json({
          success: false,
          error: 'Los parámetros "desde" y "hasta" son requeridos (formato: YYYY-MM-DD)',
        });
      }

      const fechaDesde = new Date(desde);
      const fechaHasta = new Date(hasta);
      fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día hasta

      if (isNaN(fechaDesde.getTime()) || isNaN(fechaHasta.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Formato de fecha inválido. Use YYYY-MM-DD',
        });
      }

      if (fechaDesde > fechaHasta) {
        return res.status(400).json({
          success: false,
          error: 'La fecha "desde" no puede ser mayor que "hasta"',
        });
      }

      const kardex = await kardexService.obtenerKardexFiltrado(
        id,
        req.user.empresaId,
        fechaDesde,
        fechaHasta
      );

      res.status(200).json({
        success: true,
        message: 'Kardex filtrado obtenido exitosamente',
        data: kardex,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new KardexController();

