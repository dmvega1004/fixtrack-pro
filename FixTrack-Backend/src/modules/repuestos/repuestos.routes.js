// src/modules/repuestos/repuestos.routes.js
const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/authenticate");
const repuestosController = require("./repuestos.controller");

router.get("/", authenticate, repuestosController.listar);
router.post("/", authenticate, repuestosController.crear);
router.get("/:id", authenticate, repuestosController.obtener);
router.put("/:id", authenticate, repuestosController.actualizar); // ⬅️ Nuevo
router.delete("/:id", authenticate, repuestosController.eliminar); // ⬅️ Nuevo

// Endpoint para registrar movimientos de stock (ENTRADA/SALIDA)
router.post("/:id/movimientos", authenticate, repuestosController.crearMovimiento); // ⬅️ CRÍTICO

module.exports = router;