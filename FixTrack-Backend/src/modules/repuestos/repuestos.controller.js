// src/modules/repuestos/repuestos.controller.js
const repuestosService = require("./repuestos.service");

// Función envoltorio para manejo de errores global (opcional pero recomendado)
function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = {
  // ----------------------------------------------------
  // CRUD BÁSICO
  // ----------------------------------------------------
  listar: wrap(async (req, res) => {
    const empresaId = req.user.empresaId;
    const { page, limit, q, onlyAvailable } = req.query; // Añadir soporte para filtros
    const repuestos = await repuestosService.listar({
      empresaId,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      q,
      onlyAvailable
    });
    return res.json(repuestos);
  }),

  crear: wrap(async (req, res) => {
    const empresaId = req.user.empresaId;
    const userId = req.user.id; // Necesario para el registro de movimiento
    
    const data = {
      empresaId,
      nombre: req.body.nombre,
      sku: req.body.sku || req.body.codigo, // Aceptar ambos para compatibilidad
      descripcion: req.body.descripcion,
      stock: req.body.stock ?? 0,
      precioUnit: req.body.precioUnit ?? 0,
    };

    const nuevo = await repuestosService.crear({ data, empresaId, userId });
    return res.status(201).json(nuevo); // 201 Created
  }),

  obtener: wrap(async (req, res) => {
    const empresaId = req.user.empresaId;
    const repuestoId = parseInt(req.params.id);

    const repuesto = await repuestosService.obtener({ empresaId, id: repuestoId });
    if (!repuesto) return res.status(404).json({ error: "Repuesto no encontrado" });

    return res.json(repuesto);
  }),
  
  actualizar: wrap(async (req, res) => {
    const empresaId = req.user.empresaId;
    const repuestoId = parseInt(req.params.id);
    const updated = await repuestosService.actualizar({ id: repuestoId, data: req.body, empresaId });
    return res.json(updated);
  }),
  
  eliminar: wrap(async (req, res) => {
    const empresaId = req.user.empresaId;
    const repuestoId = parseInt(req.params.id);
    const out = await repuestosService.softDelete({ id: repuestoId, empresaId });
    return res.json(out);
  }),

  // ----------------------------------------------------
  // LÓGICA DE INVENTARIO (CRÍTICO)
  // ----------------------------------------------------
  crearMovimiento: wrap(async (req, res) => {
    const empresaId = req.user.empresaId;
    const userId = req.user.id;
    const repuestoId = parseInt(req.params.id);
    const { tipo, cantidad, nota, unitCost } = req.body; // tipo: 'INGRESO', 'SALIDA' o 'AJUSTE'

    const mov = await repuestosService.crearMovimiento({ 
      repuestoId, 
      empresaId, 
      tipo, 
      cantidad: Number(cantidad), 
      nota, 
      userId,
      unitCost: unitCost ? Number(unitCost) : undefined
    });
    
    return res.status(201).json(mov);
  }),
};