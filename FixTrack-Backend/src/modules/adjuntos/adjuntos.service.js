const prisma = require("../../config/database");
const fs = require("fs");
const path = require("path");

module.exports = {
  async listarPorOrden(empresaId, ordenId) {
    return await prisma.adjunto.findMany({
      where: { empresaId, ordenId },
      orderBy: { creadoEn: "desc" },
    });
  },

  async crear(empresaId, ordenId, file, userId) {
    if (!file) {
      throw new Error("Debe subir un archivo válido");
    }

    return await prisma.adjunto.create({
      data: {
        empresaId,
        ordenId,
        url: file.filename,
        tipo: file.mimetype,
        nombre: file.originalname,
        creadoPorId: userId,
      },
    });
  },

  async eliminar(empresaId, adjuntoId) {
    const adjunto = await prisma.adjunto.findFirst({
      where: { id: adjuntoId, empresaId },
    });

    if (!adjunto) {
      throw new Error("Adjunto no encontrado.");
    }

    // Eliminar de la base de datos
    await prisma.adjunto.delete({
      where: { id: adjuntoId },
    });

    // Eliminar archivo físico
    const filePath = path.join(__dirname, "../../../uploads", adjunto.url);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return true;
  },
};
