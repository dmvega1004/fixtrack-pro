// src/modules/dashboard/dashboard.controller.js
const dashboardService = require('./dashboard.service');

class DashboardController {
  async getResumen(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const data = await dashboardService.getResumen(empresaId);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Error al obtener resumen del dashboard'
      });
    }
  }
}

module.exports = new DashboardController();