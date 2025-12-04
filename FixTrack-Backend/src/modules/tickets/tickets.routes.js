// src/modules/tickets/tickets.routes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./tickets.controller");

router.use(authenticate);

// -- TICKETS --
router.post("/", controller.crear);
router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.put("/:id/asignar", controller.asignarTecnico);
router.put("/:id/estado", controller.cambiarEstado);
router.put("/:id/cerrar", controller.cerrar);

// -- MENSAJES --
// GET /api/tickets/:id/mensajes -> Listar mensajes de un ticket
router.get("/:id/mensajes", controller.listarMensajes);

// POST /api/tickets/:id/mensajes -> Agregar mensaje a un ticket
router.post("/:id/mensajes", controller.agregarMensaje);

// PUT /api/tickets/mensaje/:id/leido -> Marcar mensaje específico como leído
router.put("/mensaje/:id/leido", controller.marcarLeido);

module.exports = router;