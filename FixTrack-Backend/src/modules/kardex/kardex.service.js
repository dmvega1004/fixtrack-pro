const prisma = require('../../config/database');

/**
 * Servicio de Kardex Contable con CPP (Costo Promedio Ponderado)
 * Maneja el cálculo contable y generación de reportes de inventario
 */
class KardexService {
  /**
   * Calcula el Costo Promedio Ponderado (CPP) basado en movimientos
   * @param {Array} movimientos - Array de movimientos ordenados
   * @param {number} stockInicial - Stock inicial
   * @param {number} costoInicial - Costo inicial
   * @returns {Array} Array de movimientos con cálculos CPP
   */
  calcularCPP(movimientos, stockInicial = 0, costoInicial = 0) {
    let stockAcumulado = stockInicial;
    let costoTotalAcumulado = costoInicial * stockInicial;
    let costoPromedio = stockInicial > 0 ? costoTotalAcumulado / stockAcumulado : 0;

    return movimientos.map((mov) => {
      const stockAntes = stockAcumulado;
      const costoPromedioAntes = costoPromedio;
      let entrada = 0;
      let salida = 0;
      let subtotal = 0;

      if (mov.tipo === 'INGRESO') {
        entrada = mov.cantidad;
        stockAcumulado += entrada;
        costoTotalAcumulado += entrada * mov.unitCost;
        costoPromedio = stockAcumulado > 0 ? costoTotalAcumulado / stockAcumulado : 0;
        subtotal = entrada * mov.unitCost;
      } else if (mov.tipo === 'SALIDA') {
        salida = mov.cantidad;
        const costoSalida = salida * costoPromedio;
        stockAcumulado -= salida;
        costoTotalAcumulado -= costoSalida;
        costoPromedio = stockAcumulado > 0 ? costoTotalAcumulado / stockAcumulado : 0;
        subtotal = costoSalida;
      } else if (mov.tipo === 'AJUSTE') {
        // AJUSTE puede ser positivo o negativo
        if (mov.cantidad > 0) {
          // Ajuste positivo (entrada)
          entrada = mov.cantidad;
          stockAcumulado += entrada;
          costoTotalAcumulado += entrada * mov.unitCost;
          costoPromedio = stockAcumulado > 0 ? costoTotalAcumulado / stockAcumulado : 0;
          subtotal = entrada * mov.unitCost;
        } else {
          // Ajuste negativo (salida)
          salida = Math.abs(mov.cantidad);
          const costoSalida = salida * costoPromedio;
          stockAcumulado -= salida;
          costoTotalAcumulado -= costoSalida;
          costoPromedio = stockAcumulado > 0 ? costoTotalAcumulado / stockAcumulado : 0;
          subtotal = costoSalida;
        }
      }

      // Si el stock llega a 0, reiniciar costos
      if (stockAcumulado === 0) {
        costoTotalAcumulado = 0;
        costoPromedio = 0;
      }

      return {
        ...mov,
        stockAntes,
        entrada,
        salida,
        stockDespues: stockAcumulado,
        costoPromedio: costoPromedio,
        subtotal: subtotal,
      };
    });
  }

  /**
   * Obtiene el resumen de inventario para el dashboard
   * @param {number} empresaId - ID de la empresa
   * @returns {Promise<Object>} Resumen de inventario
   */
  async obtenerResumen(empresaId) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    // Total de repuestos activos
    const totalRepuestos = await prisma.repuesto.count({
      where: {
        empresaId,
        estado: true,
      },
    });

    // Total de stock (suma de todos los stocks)
    const totalStockResult = await prisma.repuesto.aggregate({
      where: {
        empresaId,
        estado: true,
      },
      _sum: {
        stock: true,
      },
    });

    // Total de entradas hoy
    const totalEntradasHoy = await prisma.repuestoMovimiento.count({
      where: {
        empresaId,
        tipo: 'INGRESO',
        creadoEn: {
          gte: hoy,
          lt: mañana,
        },
      },
    });

    // Total de salidas hoy
    const totalSalidasHoy = await prisma.repuestoMovimiento.count({
      where: {
        empresaId,
        tipo: 'SALIDA',
        creadoEn: {
          gte: hoy,
          lt: mañana,
        },
      },
    });

    // Repuestos bajo stock
    // Primero obtener todos los repuestos activos
    const todosRepuestos = await prisma.repuesto.findMany({
      where: {
        empresaId,
        estado: true,
      },
      select: {
        id: true,
        nombre: true,
        stock: true,
        stockMinimo: true,
      },
    });

    // Filtrar los que están bajo stock
    const repuestosBajoStock = todosRepuestos.filter((rep) => {
      if (rep.stockMinimo !== null && rep.stockMinimo > 0) {
        return rep.stock <= rep.stockMinimo;
      }
      return rep.stock <= 0;
    }).sort((a, b) => a.stock - b.stock);

    return {
      totalRepuestos,
      totalStock: totalStockResult._sum.stock || 0,
      totalEntradasHoy,
      totalSalidasHoy,
      repuestosBajoStock,
    };
  }

  /**
   * Obtiene el kardex completo de un repuesto con CPP
   * @param {number} repuestoId - ID del repuesto
   * @param {number} empresaId - ID de la empresa
   * @returns {Promise<Object>} Kardex completo con CPP
   */
  async obtenerKardexPorRepuesto(repuestoId, empresaId) {
    // Validar que el repuesto existe y pertenece a la empresa
    const repuesto = await prisma.repuesto.findFirst({
      where: {
        id: parseInt(repuestoId),
        empresaId,
        estado: true,
      },
      select: {
        id: true,
        nombre: true,
        stock: true,
        costoPromedio: true,
        sku: true,
        descripcion: true,
      },
    });

    if (!repuesto) {
      const error = new Error('Repuesto no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }

    // Obtener todos los movimientos ordenados por fecha
    const movimientos = await prisma.repuestoMovimiento.findMany({
      where: {
        repuestoId: parseInt(repuestoId),
        empresaId, // Validación multi-tenant
      },
      include: {
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'asc',
      },
    });

    // Calcular CPP
    const kardex = this.calcularCPP(movimientos);

    return {
      repuesto: {
        id: repuesto.id,
        nombre: repuesto.nombre,
        sku: repuesto.sku,
        descripcion: repuesto.descripcion,
        stockActual: repuesto.stock,
        costoPromedioActual: repuesto.costoPromedio,
      },
      kardex: kardex.map((mov) => ({
        fecha: mov.creadoEn,
        tipo: mov.tipo,
        nota: mov.nota,
        usuario: mov.creadoPor ? mov.creadoPor.nombre : 'Sistema',
        stockAntes: mov.stockAntes,
        entrada: mov.entrada,
        salida: mov.salida,
        stockDespues: mov.stockDespues,
        unitCost: mov.unitCost,
        subtotal: mov.subtotal,
        costoPromedio: mov.costoPromedio,
      })),
    };
  }

  /**
   * Obtiene el kardex filtrado por fechas
   * @param {number} repuestoId - ID del repuesto
   * @param {number} empresaId - ID de la empresa
   * @param {Date} fechaDesde - Fecha desde
   * @param {Date} fechaHasta - Fecha hasta
   * @returns {Promise<Object>} Kardex filtrado con CPP
   */
  async obtenerKardexFiltrado(repuestoId, empresaId, fechaDesde, fechaHasta) {
    // Validar que el repuesto existe y pertenece a la empresa
    const repuesto = await prisma.repuesto.findFirst({
      where: {
        id: parseInt(repuestoId),
        empresaId,
        estado: true,
      },
      select: {
        id: true,
        nombre: true,
        stock: true,
        costoPromedio: true,
        sku: true,
        descripcion: true,
      },
    });

    if (!repuesto) {
      const error = new Error('Repuesto no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }

    // Obtener movimientos anteriores a fechaDesde para calcular stock base
    const movimientosAnteriores = await prisma.repuestoMovimiento.findMany({
      where: {
        repuestoId: parseInt(repuestoId),
        empresaId,
        creadoEn: {
          lt: fechaDesde,
        },
      },
      orderBy: {
        creadoEn: 'asc',
      },
    });

    // Calcular stock base y costo base antes del rango
    const baseCalculada = this.calcularCPP(movimientosAnteriores);
    const stockBase = baseCalculada.length > 0 
      ? baseCalculada[baseCalculada.length - 1].stockDespues 
      : 0;
    const costoBase = baseCalculada.length > 0 
      ? baseCalculada[baseCalculada.length - 1].costoPromedio 
      : 0;

    // Obtener movimientos en el rango de fechas
    const movimientosEnRango = await prisma.repuestoMovimiento.findMany({
      where: {
        repuestoId: parseInt(repuestoId),
        empresaId,
        creadoEn: {
          gte: fechaDesde,
          lte: fechaHasta,
        },
      },
      include: {
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        creadoEn: 'asc',
      },
    });

    // Calcular CPP desde el stock base
    const kardex = this.calcularCPP(movimientosEnRango, stockBase, costoBase);

    return {
      repuesto: {
        id: repuesto.id,
        nombre: repuesto.nombre,
        sku: repuesto.sku,
        descripcion: repuesto.descripcion,
        stockActual: repuesto.stock,
        costoPromedioActual: repuesto.costoPromedio,
      },
      filtros: {
        desde: fechaDesde,
        hasta: fechaHasta,
        stockBase,
        costoBase,
      },
      kardex: kardex.map((mov) => ({
        fecha: mov.creadoEn,
        tipo: mov.tipo,
        nota: mov.nota,
        usuario: mov.creadoPor ? mov.creadoPor.nombre : 'Sistema',
        stockAntes: mov.stockAntes,
        entrada: mov.entrada,
        salida: mov.salida,
        stockDespues: mov.stockDespues,
        unitCost: mov.unitCost,
        subtotal: mov.subtotal,
        costoPromedio: mov.costoPromedio,
      })),
    };
  }
}

module.exports = new KardexService();

