// src/modules/tickets/tickets.service.js
const prisma = require("../../config/database");

class TicketsService {
  
  // ---------------------------------------------------------------
  // TICKETS
  // ---------------------------------------------------------------

  async crear(data, userId, empresaId) {
    // 1. Generar código único (TKT-001)
    const lastTicket = await prisma.ticket.findFirst({
      where: { empresaId },
      orderBy: { id: 'desc' }
    });

    let nuevoCodigo = 'TKT-001';
    if (lastTicket && lastTicket.codigo) {
      const parts = lastTicket.codigo.split('-');
      const num = parseInt(parts[1]) + 1;
      nuevoCodigo = `TKT-${String(num).padStart(3, '0')}`;
    }

    // 2. Validar Cliente
    const cliente = await prisma.cliente.findFirst({
        where: { id: data.clienteId, empresaId }
    });
    if (!cliente) throw new Error("El cliente no existe o no pertenece a la empresa.");

    // 3. Crear Ticket
    return prisma.ticket.create({
      data: {
        empresaId,
        clienteId: data.clienteId,
        equipoId: data.equipoId || null,
        tecnicoId: data.tecnicoId || null,
        codigo: nuevoCodigo,
        asunto: data.asunto,
        descripcion: data.descripcion,
        prioridad: data.prioridad || 'MEDIA',
        estado: 'ABIERTO'
      }
    });
  }

  async listar({ empresaId, page = 1, limit = 20, estado, prioridad, clienteId, tecnicoId }) {
    const skip = (page - 1) * limit;
    const where = { empresaId };

    if (estado) where.estado = estado;
    if (prioridad) where.prioridad = prioridad;
    if (clienteId) where.clienteId = Number(clienteId);
    if (tecnicoId) where.tecnicoId = Number(tecnicoId);

    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        include: {
          cliente: { select: { id: true, nombre: true } },
          tecnico: { select: { id: true, nombre: true } },
          equipo: { select: { id: true, nombre: true, codigoQR: true } }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    return { items, total, page, limit };
  }

  async obtenerPorId(id, empresaId) {
    const ticket = await prisma.ticket.findFirst({
      where: { id: Number(id), empresaId },
      include: {
        cliente: true,
        equipo: true,
        tecnico: true,
        orden: true,
        mensajes: {
          orderBy: { createdAt: 'asc' },
          include: {
            usuario: { select: { id: true, nombre: true, rol: true } }
          }
        }
      }
    });

    if (!ticket) throw new Error("Ticket no encontrado.");
    return ticket;
  }

  async asignarTecnico(id, tecnicoId, empresaId) {
    // Validar que el técnico pertenezca a la empresa
    const tecnico = await prisma.usuario.findFirst({
      where: { id: tecnicoId, empresaId }
    });
    if (!tecnico) throw new Error("El técnico no es válido.");

    return prisma.ticket.update({
      where: { id: Number(id) },
      data: { tecnicoId }
    });
  }

  async cambiarEstado(id, nuevoEstado, empresaId) {
    const data = { estado: nuevoEstado };
    
    // Si se cierra o resuelve, se puede marcar fecha de cierre
    if (nuevoEstado === 'CERRADO' || nuevoEstado === 'RESUELTO') {
        data.fechaCierre = new Date();
    }

    return prisma.ticket.updateMany({ // updateMany para asegurar empresaId en where
      where: { id: Number(id), empresaId },
      data
    });
  }

  async cerrarTicket(id, empresaId) {
    return prisma.ticket.updateMany({
      where: { id: Number(id), empresaId },
      data: { 
        estado: 'CERRADO',
        fechaCierre: new Date()
      }
    });
  }

  // ---------------------------------------------------------------
  // MENSAJERÍA
  // ---------------------------------------------------------------

  async agregarMensaje({ ticketId, userId, mensaje, esInterno, empresaId }) {
    // 1. Verificar que el ticket existe y pertenece a la empresa
    const ticket = await prisma.ticket.findFirst({
        where: { id: Number(ticketId), empresaId }
    });
    if (!ticket) throw new Error("Ticket no encontrado.");

    if (ticket.estado === 'CERRADO') {
        throw new Error("No se pueden agregar mensajes a un ticket cerrado.");
    }

    // 2. Crear mensaje
    return prisma.ticketMensaje.create({
        data: {
            ticketId: Number(ticketId),
            usuarioId: userId,
            mensaje,
            esInterno: esInterno || false,
            leido: false
        },
        include: {
            usuario: { select: { id: true, nombre: true } }
        }
    });
  }

  async listarMensajes(ticketId, empresaId) {
    // Verificar acceso
    const ticket = await prisma.ticket.count({ where: { id: Number(ticketId), empresaId } });
    if (!ticket) throw new Error("Ticket no encontrado.");

    return prisma.ticketMensaje.findMany({
        where: { ticketId: Number(ticketId) },
        orderBy: { createdAt: 'asc' },
        include: {
            usuario: { select: { id: true, nombre: true, rol: true } }
        }
    });
  }

  async marcarMensajeLeido(mensajeId, empresaId) {
    // Verificar que el mensaje pertenece a un ticket de la empresa
    const mensaje = await prisma.ticketMensaje.findFirst({
        where: { id: Number(mensajeId), ticket: { empresaId } }
    });

    if (!mensaje) throw new Error("Mensaje no accesible.");

    return prisma.ticketMensaje.update({
        where: { id: Number(mensajeId) },
        data: { leido: true }
    });
  }
}

module.exports = new TicketsService();