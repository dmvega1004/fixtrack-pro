const adjuntosService = require("./adjuntos.service");

module.exports = {
  async listar(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const ordenId = parseInt(req.params.ordenId);

      const adjuntos = await adjuntosService.listarPorOrden(
        empresaId,
        ordenId
      );

      return res.json({ success: true, data: adjuntos });
    } catch (err) {
      console.error("Error listando adjuntos:", err);
      return res.status(500).json({ error: "Error listando adjuntos" });
    }
  },

  async subir(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const userId = req.user.id;
      const ordenId = parseInt(req.params.ordenId);

      const file = req.file;

      const adjunto = await adjuntosService.crear(
        empresaId,
        ordenId,
        file,
        userId
      );

      return res.json({ success: true, data: adjunto });
    } catch (err) {
      console.error("Error cargando archivo:", err);
      return res.status(500).json({ error: "Error subiendo archivo" });
    }
  },

  async eliminar(req, res) {
    try {
      const empresaId = req.user.empresaId;
      const adjuntoId = parseInt(req.params.id);

      await adjuntosService.eliminar(empresaId, adjuntoId);

      return res.json({ success: true, message: "Adjunto eliminado" });
    } catch (err) {
      console.error("Error eliminando adjunto:", err);
      return res.status(500).json({ error: "Error eliminando adjunto" });
    }
  },
};
