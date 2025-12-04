// src/modules/movimientos/movimientos.service.js
const prisma = require("../../config/database");


class MovimientosService {
  // -------------------------------------------------
  // LISTAR MOVIMIENTOS (con filtros opcionales)
  // -------------------------------------------------
  async listarMovimientos(empresaId, filtros) {
    const { tipo, repuestoId } = filtros;

    return prisma.repuestoMovimiento.findMany({
      where: {
        empresaId,
        tipo: tipo || undefined,
        repuestoId: repuestoId ? Number(repuestoId) : undefined
      },
      include: {
        repuesto: true,
        creadoPor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        creadoEn: "desc"
      }
    });
  }

  // -------------------------------------------------
  // CREAR MOVIMIENTO
  // Entrada o Salida de inventario
  // -------------------------------------------------
  async crearMovimiento(empresaId, usuarioId, data) {
    const { repuestoId, tipo, cantidad, nota, unitCost } = data;

    const repuesto = await prisma.repuesto.findFirst({
      where: { id: repuestoId, empresaId }
    });

    if (!repuesto) {
      throw new Error("El repuesto no existe o no pertenece a tu empresa.");
    }

    const cant = Number(cantidad);

    if (cant <= 0) {
      throw new Error("La cantidad debe ser mayor a cero.");
    }

    // Determinar unitCost según el tipo de movimiento
    let unitCostFinal = 0;
    if (tipo === "INGRESO" || (tipo === "AJUSTE" && cant > 0)) {
      // Para INGRESO o AJUSTE positivo, usar unitCost del body o precioUnit del repuesto
      unitCostFinal = unitCost ? Number(unitCost) : repuesto.precioUnit || 0;
    } else if (tipo === "SALIDA" || (tipo === "AJUSTE" && cant < 0)) {
      // Para SALIDA o AJUSTE negativo, usar el costo promedio actual (se calculará en kardex)
      unitCostFinal = repuesto.costoPromedio || 0;
    }

    let nuevoStock = repuesto.stock;
    let nuevoCostoPromedio = repuesto.costoPromedio;

    if (tipo === "INGRESO") {
      nuevoStock += cant;
      // Recalcular CPP: (stockActual * costoPromedioActual + cantidad * unitCost) / nuevoStock
      const costoTotalActual = repuesto.stock * repuesto.costoPromedio;
      const costoTotalNuevo = costoTotalActual + (cant * unitCostFinal);
      nuevoCostoPromedio = nuevoStock > 0 ? costoTotalNuevo / nuevoStock : 0;
    } else if (tipo === "SALIDA") {
      nuevoStock -= cant;
      if (nuevoStock < 0) {
        throw new Error("Stock insuficiente para realizar esta salida.");
      }
      // Para SALIDA, el costo promedio se mantiene (solo se resta el stock)
      // Si stock llega a 0, reiniciar costo promedio
      if (nuevoStock === 0) {
        nuevoCostoPromedio = 0;
      }
    } else if (tipo === "AJUSTE") {
      // Para AJUSTE, se puede usar cantidad positiva o negativa
      if (cant > 0) {
        // Ajuste positivo (entrada)
        nuevoStock += cant;
        const costoTotalActual = repuesto.stock * repuesto.costoPromedio;
        const costoTotalNuevo = costoTotalActual + (cant * unitCostFinal);
        nuevoCostoPromedio = nuevoStock > 0 ? costoTotalNuevo / nuevoStock : 0;
      } else {
        // Ajuste negativo (salida)
        nuevoStock = Math.abs(cant);
        if (nuevoStock === 0) {
          nuevoCostoPromedio = 0;
        }
      }
    } else {
      throw new Error("Tipo de movimiento inválido (usar INGRESO, SALIDA o AJUSTE).");
    }

    // Registrar movimiento + Actualizar stock y costo promedio
    const movimiento = await prisma.$transaction(async (tx) => {
      const mov = await tx.repuestoMovimiento.create({
        data: {
          empresaId,
          repuestoId,
          tipo,
          cantidad: cant,
          unitCost: unitCostFinal,
          nota: nota || null,
          creadoPorId: usuarioId
        }
      });

      await tx.repuesto.update({
        where: { id: repuestoId },
        data: { 
          stock: nuevoStock,
          costoPromedio: nuevoCostoPromedio
        }
      });

      return mov;
    });

    return movimiento;
  }

  // -------------------------------------------------
  // OBTENER DETALLE DE UN MOVIMIENTO
  // -------------------------------------------------
  async obtenerMovimiento(empresaId, id) {
    const movimiento = await prisma.repuestoMovimiento.findFirst({
      where: { id, empresaId },
      include: {
        repuesto: true,
        creadoPor: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    if (!movimiento) {
      throw new Error("Movimiento no encontrado.");
    }

    return movimiento;
  }
}

module.exports = new MovimientosService();
