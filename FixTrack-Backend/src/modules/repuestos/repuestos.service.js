// src/modules/repuestos/repuestos.service.js
const prisma = require("../../config/database");


class RepuestosService {
  /**
   * Lista repuestos con paginación, filtros y multi-tenancy.
   */
  async listar({ empresaId, page = 1, limit = 20, q, onlyAvailable }) {
    const skip = (page - 1) * limit;
    const where = {
      empresaId,
      estado: true, // Solo activos (Soft Delete)
      ...(q && {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } }
        ]
      }),
      ...(onlyAvailable === 'true' && { stock: { gt: 0 } }),
    };

    const [items, total] = await Promise.all([
      prisma.repuesto.findMany({ where, skip, take: limit, orderBy: { nombre: 'asc' } }),
      prisma.repuesto.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Obtiene un repuesto por ID con su historial de movimientos.
   */
  async obtener({ id, empresaId }) {
    const repuesto = await prisma.repuesto.findFirst({
      where: { id: Number(id), empresaId, estado: true },
      include: { movimientos: { orderBy: { createdAt: 'desc' } } },
    });
    if (!repuesto) throw { status: 404, message: 'Repuesto no encontrado' };
    return repuesto;
  }

  /**
   * Crea un repuesto y registra el movimiento de stock inicial. (CRÍTICO)
   */
  async crear({ data, empresaId, userId }) {
    // Usamos una transacción para garantizar que Repuesto y Movimiento se creen juntos.
    const newRep = await prisma.$transaction(async (tx) => {
      const rep = await tx.repuesto.create({
        data: {
          nombre: data.nombre,
          sku: data.sku || null,
          descripcion: data.descripcion || null,
          stock: data.stock || 0,
          precioUnit: data.precioUnit || 0,
          empresaId,
        },
      });

      if ((data.stock || 0) > 0) {
        const unitCostInicial = data.precioUnit || 0;
        await tx.repuestoMovimiento.create({
          data: {
            repuestoId: rep.id,
            empresaId,
            tipo: 'INGRESO', // Primer movimiento (usar INGRESO según el enum)
            cantidad: data.stock,
            unitCost: unitCostInicial,
            nota: 'Stock inicial',
            creadoPorId: userId || null,
          },
        });
        
        // Actualizar costo promedio inicial
        await tx.repuesto.update({
          where: { id: rep.id },
          data: { costoPromedio: unitCostInicial }
        });
      }
      return rep;
    });

    return newRep;
  }

  /**
   * Actualiza datos básicos del repuesto (no stock).
   */
  async actualizar({ id, data, empresaId }) {
    const rep = await prisma.repuesto.findFirst({ where: { id: Number(id), empresaId, estado: true } });
    if (!rep) throw { status: 404, message: 'Repuesto no encontrado' };

    const updated = await prisma.repuesto.update({
      where: { id: Number(id) },
      data: {
        nombre: data.nombre,
        codigo: data.codigo,
        descripcion: data.descripcion,
        precioUnit: typeof data.precioUnit === 'number' ? data.precioUnit : undefined,
        unidad: data.unidad,
      },
    });
    return updated;
  }

  /**
   * Desactiva un repuesto (Soft Delete).
   */
  async softDelete({ id, empresaId }) {
    const rep = await prisma.repuesto.findFirst({ where: { id: Number(id), empresaId, estado: true } });
    if (!rep) throw { status: 404, message: 'Repuesto no encontrado' };
    
    // No permitimos el borrado si hay stock, forzamos a poner stock en 0 antes.
    if (rep.stock > 0) throw { status: 400, message: 'No se puede desactivar un repuesto con stock disponible. Ajuste el stock a cero primero.' };

    await prisma.repuesto.update({ where: { id: rep.id }, data: { estado: false } });
    return { success: true };
  }

  /**
   * Maneja ingresos o salidas manuales de stock y registra el movimiento (CRÍTICO).
   */
  async crearMovimiento({ repuestoId, empresaId, tipo, cantidad, nota, userId, unitCost }) {
    const rep = await prisma.repuesto.findFirst({ where: { id: Number(repuestoId), empresaId, estado: true } });
    if (!rep) throw { status: 404, message: 'Repuesto no encontrado' };

    // Validar stock para salidas
    if (tipo === 'SALIDA' && rep.stock < cantidad) throw { status: 400, message: 'Stock insuficiente para registrar la salida' };
    if (cantidad <= 0) throw { status: 400, message: 'La cantidad debe ser mayor a cero' };

    // Determinar unitCost según el tipo de movimiento
    let unitCostFinal = 0;
    if (tipo === 'INGRESO' || (tipo === 'AJUSTE' && cantidad > 0)) {
      // Para INGRESO o AJUSTE positivo, usar unitCost del body o precioUnit del repuesto
      unitCostFinal = unitCost ? Number(unitCost) : rep.precioUnit || 0;
    } else if (tipo === 'SALIDA' || (tipo === 'AJUSTE' && cantidad < 0)) {
      // Para SALIDA o AJUSTE negativo, usar el costo promedio actual
      unitCostFinal = rep.costoPromedio || 0;
    }

    let newStock = tipo === 'INGRESO' ? rep.stock + cantidad : rep.stock - cantidad;
    let nuevoCostoPromedio = rep.costoPromedio;

    // Recalcular CPP para INGRESO o AJUSTE positivo
    if (tipo === 'INGRESO' || (tipo === 'AJUSTE' && cantidad > 0)) {
      const costoTotalActual = rep.stock * rep.costoPromedio;
      const costoTotalNuevo = costoTotalActual + (cantidad * unitCostFinal);
      nuevoCostoPromedio = newStock > 0 ? costoTotalNuevo / newStock : 0;
    } else if (tipo === 'SALIDA' || (tipo === 'AJUSTE' && cantidad < 0)) {
      // Para SALIDA, el costo promedio se mantiene
      // Si stock llega a 0, reiniciar costo promedio
      if (newStock === 0) {
        nuevoCostoPromedio = 0;
      }
    }
    
    // Usamos una transacción para asegurar que el movimiento y el stock se actualicen juntos
    const [movimiento, updatedRepuesto] = await prisma.$transaction([
      prisma.repuestoMovimiento.create({
        data: { 
          repuestoId: rep.id, 
          empresaId, 
          tipo, 
          cantidad, 
          unitCost: unitCostFinal,
          nota: nota || null, 
          creadoPorId: userId || null 
        },
      }),
      prisma.repuesto.update({ 
        where: { id: rep.id }, 
        data: { 
          stock: newStock,
          costoPromedio: nuevoCostoPromedio
        } 
      })
    ]);

    return { movimiento, newStock: updatedRepuesto.stock };
  }

  /**
   * Método para la integración con ÓRDENES: restar stock masivo con transacciones (CRÍTICO).
   */
  async restarStockPorOrden({ items /* [{repuestoId, cantidad}] */, empresaId, userId, ordenId }) {
    const results = [];
    
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const repId = item.repuestoId;
        const cantidad = item.cantidad;

        // 1. Bloquear y verificar stock
        const rep = await tx.repuesto.findFirst({ 
          where: { id: repId, empresaId, estado: true },
          // Esto es importante en sistemas concurrentes para evitar race conditions
        });

        if (!rep) throw new Error(`Repuesto ${repId} no encontrado o inactivo.`);
        if (rep.stock < cantidad) throw new Error(`Stock insuficiente para ${rep.nombre}. Disponible: ${rep.stock}, Solicitado: ${cantidad}`);
        
        // 2. Crear movimiento SALIDA
        await tx.repuestoMovimiento.create({
          data: { 
            repuestoId: rep.id, 
            empresaId, 
            tipo: 'SALIDA', 
            cantidad, 
            nota: `Consumo en Orden ${ordenId}`, 
            creadoPorId: userId 
          },
        });

        // 3. Actualizar stock
        const updatedRep = await tx.repuesto.update({ 
          where: { id: rep.id }, 
          data: { stock: rep.stock - cantidad } 
        });

        // 4. Registrar datos para la tabla intermedia OrdenRepuesto
        results.push({ 
          repuestoId: rep.id, 
          cantidad, 
          precioUnit: rep.precioUnit, // Se guarda el precio del momento
          newStock: updatedRep.stock 
        });
      }
    });
    
    return results;
  }
}

module.exports = new RepuestosService();