const prisma = require("../../config/database");

class ConfigService {
  
  // ---------------------------------------------------------------
  // A. CATÁLOGOS (Listas Desplegables)
  // ---------------------------------------------------------------

  async crearItemCatalogo({ empresaId, tipo, valor, descripcion }) {
    return prisma.catalogo.create({
      data: {
        empresaId,
        tipo,
        valor,
        descripcion,
        activo: true
      }
    });
  }

  async listarCatalogo(empresaId, tipo) {
    return prisma.catalogo.findMany({
      where: { 
        empresaId, 
        tipo, 
        activo: true 
      },
      orderBy: { valor: 'asc' }
    });
  }

  async eliminarItemCatalogo(id, empresaId) {
    // Soft Delete (lo marcamos como inactivo para no romper historiales)
    return prisma.catalogo.updateMany({
      where: { id: Number(id), empresaId },
      data: { activo: false }
    });
  }

  // ---------------------------------------------------------------
  // B. CONFIGURACIONES GLOBALES (Variables de Sistema)
  // ---------------------------------------------------------------

  async guardarConfig({ empresaId, clave, valor, descripcion }) {
    // UPSERT: Si existe la clave para esa empresa, actualiza. Si no, crea.
    return prisma.configuracion.upsert({
      where: {
        empresaId_clave: { empresaId, clave }
      },
      update: { valor, descripcion },
      create: { empresaId, clave, valor, descripcion }
    });
  }

  async obtenerTodas(empresaId) {
    const configs = await prisma.configuracion.findMany({
      where: { empresaId }
    });

    // Convertimos el array en un objeto simple: { "IVA": "0.19", "MONEDA": "COP" }
    // Esto es más fácil de usar para el Frontend
    const configObjeto = {};
    configs.forEach(c => {
      configObjeto[c.clave] = c.valor;
    });

    return configObjeto;
  }
  
  // Método opcional para inicializar datos básicos
  async inicializarDefaults(empresaId) {
     // Aquí podrías crear monedas por defecto, etc.
     await this.guardarConfig({ empresaId, clave: "IVA", valor: "19" });
     await this.guardarConfig({ empresaId, clave: "MONEDA", valor: "COP" });
  }
}

module.exports = new ConfigService();