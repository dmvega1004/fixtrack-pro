// src/modules/dashboard/dashboard.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DashboardService {
  async getResumen(empresaId) {
    const [ordenesAbiertas, equiposEnTaller, clientesActivos, repuestosCriticos, tecnicosDisponibles] = await Promise.all([
      // Órdenes abiertas (estado diferente de FINALIZADA o CANCELADA)
      prisma.ordenTrabajo.count({
        where: {
          empresaId,
          estado: { notIn: ['FINALIZADA', 'CANCELADA'] }
        }
      }),

      // Equipos en taller (asumiendo que tienen estado EN_TALLER o EN_REPARACION)
      prisma.equipo.count({
        where: {
          empresaId,
          estado: 'EN_REPARACION' // o el estado que uses
        }
      }),

      // Clientes activos (puedes filtrar por los que tienen al menos una orden)
      prisma.cliente.count({
        where: { empresaId }
      }),

      // Repuestos críticos (stock < 5, ajusta el número según tu negocio)
      prisma.repuesto.count({
        where: {
          empresaId,
          stock: { lt: 5 }
        }
      }),

      // Técnicos disponibles (rol TECNICO y activo)
      prisma.usuario.findMany({
        where: {
          empresaId,
          rol: 'TECNICO',
          activo: true
        },
        select: {
          id: true,
          nombre: true
        },
        orderBy: { nombre: 'asc' }
      })
    ]);

    return {
      ordenesAbiertas,
      equiposEnTaller,
      clientesActivos,
      repuestosCriticos,
      tecnicosDisponibles
    };
  }
}

module.exports = new DashboardService();