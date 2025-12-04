// src/modules/movimientos/movimientos.routes.js
const express = require("express");
const router = express.Router();

const movimientosController = require("./movimientos.controller");
const authenticate = require("../../middlewares/authenticate");

// Todas protegidas
router.get("/", authenticate, movimientosController.listar);
router.post("/", authenticate, movimientosController.crear);
router.get("/:id", authenticate, movimientosController.obtener);

module.exports = router;
