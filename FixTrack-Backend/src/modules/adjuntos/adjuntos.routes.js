const express = require("express");
const router = express.Router();
const authenticate = require("../../middlewares/authenticate");
const upload = require("../../config/multer");
const controller = require("./adjuntos.controller");

// Listar adjuntos por orden
router.get("/:ordenId", authenticate, controller.listar);

// Subir archivo
router.post(
  "/:ordenId",
  authenticate,
  upload.single("archivo"),
  controller.subir
);

// Eliminar adjunto
router.delete("/:id", authenticate, controller.eliminar);

module.exports = router;
