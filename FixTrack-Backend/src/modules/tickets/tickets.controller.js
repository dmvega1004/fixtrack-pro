// src/modules/tickets/tickets.controller.js
const ticketsService = require("./tickets.service");

function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

module.exports = {
  // TICKETS
  crear: wrap(async (req, res) => {
    const nuevo = await ticketsService.crear(req.body, req.user.id, req.user.empresaId);
    res.status(201).json(nuevo);
  }),

  listar: wrap(async (req, res) => {
    const { page, limit, estado, prioridad, clienteId, tecnicoId } = req.query;
    const resultado = await ticketsService.listar({
        empresaId: req.user.empresaId,
        page: Number(page),
        limit: Number(limit),
        estado, prioridad, clienteId, tecnicoId
    });
    res.json(resultado);
  }),

  obtener: wrap(async (req, res) => {
    const ticket = await ticketsService.obtenerPorId(req.params.id, req.user.empresaId);
    res.json(ticket);
  }),

  asignarTecnico: wrap(async (req, res) => {
    const { tecnicoId } = req.body;
    await ticketsService.asignarTecnico(req.params.id, tecnicoId, req.user.empresaId);
    res.json({ success: true, message: "Técnico asignado correctamente." });
  }),

  cambiarEstado: wrap(async (req, res) => {
    const { estado } = req.body;
    await ticketsService.cambiarEstado(req.params.id, estado, req.user.empresaId);
    res.json({ success: true, message: "Estado actualizado." });
  }),

  cerrar: wrap(async (req, res) => {
    await ticketsService.cerrarTicket(req.params.id, req.user.empresaId);
    res.json({ success: true, message: "Ticket cerrado correctamente." });
  }),

  // MENSAJES
  agregarMensaje: wrap(async (req, res) => {
    const { mensaje, esInterno } = req.body;
    const nuevoMensaje = await ticketsService.agregarMensaje({
        ticketId: req.params.id,
        userId: req.user.id,
        empresaId: req.user.empresaId,
        mensaje,
        esInterno
    });
    res.status(201).json(nuevoMensaje);
  }),

  listarMensajes: wrap(async (req, res) => {
    const mensajes = await ticketsService.listarMensajes(req.params.id, req.user.empresaId);
    res.json(mensajes);
  }),

  marcarLeido: wrap(async (req, res) => {
    await ticketsService.marcarMensajeLeido(req.params.id, req.user.empresaId);
    res.json({ success: true });
  })
};