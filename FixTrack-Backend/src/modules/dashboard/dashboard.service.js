// src/modules/dashboard/dashboard.service.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DashboardService {
  async getResumen(empresaId) {
    try {
      // Usamos Promise.allSettled si queremos que el dashboard cargue 
      // aunque una de las consultas falle, pero Promise.all está bien si los datos son críticos.
      const [
        ordenesAbiertas, 
        equiposEnTaller, 
        clientesActivos, 
        repuestosCriticos, 
        tecnicosDisponibles
      ] = await Promise.all([
        
        // 1. Órdenes abiertas
        // VERIFICAR: Que 'PENDIENTE' y 'EN_PROCESO' existan en tu schema.prisma
        prisma.ordenTrabajo.count({
          where: {
            empresaId: Number(empresaId),
            estado: { in: ['PENDIENTE', 'EN_PROCESO'] } 
          }
        }),

        // 2. Equipos en taller
        // VERIFICAR: ¿Tu tabla se llama 'equipo' o 'Equipo'? ¿El estado es 'EN_REPARACION'?
        prisma.equipo.count({
          where: {
            empresaId: Number(empresaId),
            estado: 'EN_REPARACION' 
          }
        }).catch(() => 0), // Si la tabla equipo no existe o falla, devuelve 0 para no romper el dashboard

        // 3. Clientes activos
        prisma.cliente.count({
          where: { empresaId: Number(empresaId) }
        }),

        // 4. Repuestos críticos
        prisma.repuesto.count({
          where: {
            empresaId: Number(empresaId),
            stock: { lt: 5 }
          }
        }).catch(() => 0),

        // 5. Técnicos disponibles
        prisma.usuario.findMany({
          where: {
            empresaId: Number(empresaId),
            rol: 'TECNICO', 
            activo: true
          },
          select: {
            id: true,
            nombre: true
          }
        })
      ]);

      return {
        ordenesAbiertas,
        equiposEnTaller,
        clientesActivos,
        repuestosCriticos,
        tecnicosDisponibles: tecnicosDisponibles || []
      };
    } catch (error) {
      console.error('Error detallado en DashboardService:', error);
      // Es vital devolver un objeto vacío o valores por defecto para que el Front no explote
      return {
        ordenesAbiertas: 0,
        equiposEnTaller: 0,
        clientesActivos: 0,
        repuestosCriticos: 0,
        tecnicosDisponibles: []
      };
    }
  }
}

module.exports = new DashboardService();