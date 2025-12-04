const express = require("express");
const router = express.Router();
const authenticate = require("../../middlewares/authenticate");
const controller = require("./config.controller");

router.use(authenticate);

// -- CATÁLOGOS --
// GET /api/config/catalogos/MARCAS -> Trae todas las marcas
router.get("/catalogos/:tipo", controller.listarCatalogo);

// POST /api/config/catalogos -> Crea una nueva opción
router.post("/catalogos", controller.crearItem);

// DELETE /api/config/catalogos/:id -> Borra una opción
router.delete("/catalogos/:id", controller.eliminarItem);


// -- CONFIGURACIÓN GLOBAL --
// GET /api/config/global -> Trae todas las variables (IVA, Moneda, etc)
router.get("/global", controller.obtenerGlobales);

// POST /api/config/global -> Guarda o Actualiza una variable
router.post("/global", controller.guardarConfig);

module.exports = router;