// src/modules/movimientos/movimientos.controller.js
const movimientosService = require("./movimientos.service");

class MovimientosController {

  async listar(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const filtros = req.query;

      const movimientos = await movimientosService.listarMovimientos(
        empresaId,
        filtros
      );

      res.json(movimientos);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async crear(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const usuarioId = req.user.id;

      const movimiento = await movimientosService.crearMovimiento(
        empresaId,
        usuarioId,
        req.body
      );

      res.json(movimiento);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async obtener(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const { id } = req.params;

      const movimiento = await movimientosService.obtenerMovimiento(
        empresaId,
        Number(id)
      );

      res.json(movimiento);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  }
}

module.exports = new MovimientosController();
