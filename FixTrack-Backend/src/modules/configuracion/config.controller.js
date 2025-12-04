const configService = require("./config.service");

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = {
  // CATÁLOGOS
  crearItem: wrap(async (req, res) => {
    const { tipo, valor, descripcion } = req.body;
    const item = await configService.crearItemCatalogo({
      empresaId: req.user.empresaId,
      tipo,
      valor,
      descripcion
    });
    res.status(201).json(item);
  }),

  listarCatalogo: wrap(async (req, res) => {
    const { tipo } = req.params; // Viene en la URL: /catalogos/MARCA
    const items = await configService.listarCatalogo(req.user.empresaId, tipo);
    res.json(items);
  }),

  eliminarItem: wrap(async (req, res) => {
    const { id } = req.params;
    await configService.eliminarItemCatalogo(id, req.user.empresaId);
    res.json({ success: true, message: "Item eliminado" });
  }),

  // CONFIGURACIÓN GLOBAL
  guardarConfig: wrap(async (req, res) => {
    const { clave, valor, descripcion } = req.body;
    const config = await configService.guardarConfig({
      empresaId: req.user.empresaId,
      clave,
      valor,
      descripcion
    });
    res.json(config);
  }),

  obtenerGlobales: wrap(async (req, res) => {
    const configs = await configService.obtenerTodas(req.user.empresaId);
    res.json(configs);
  }),
};