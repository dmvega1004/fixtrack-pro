const prisma = require('../../config/database');
const repuestosService = require('../repuestos/repuestos.service');

const ESTADOS_PERMITIDOS = ['PENDIENTE', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];
const ESTADOS_CERRADOS = ['FINALIZADA', 'CANCELADA']; // Estados que "congelan" la orden
const TIPOS_ORDEN = ['PREVENTIVO', 'CORRECTIVO', 'INSTALACION'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];
const ROLES_TECNICOS = ['ADMIN', 'TECNICO'];

class OrdenesService {
  /**
   * Genera el siguiente código de orden para una empresa (ej. ORD-001)
   */
  async generarCodigoOrden(empresaId) {
    const ultimaOrden = await prisma.ordenTrabajo.findFirst({
      where: { empresaId },
      orderBy: { creadoEn: 'desc' },
      select: { codigo: true },
    });

    let numero = 1;
    if (ultimaOrden?.codigo) {
      const match = ultimaOrden.codigo.match(/ORD-(\d+)/);
      if (match) {
        numero = parseInt(match[1], 10) + 1;
      }
    }

    return `ORD-${numero.toString().padStart(3, '0')}`;
  }

  /**
   * Valida que un cliente pertenezca a la empresa
   */
  async validarCliente(clienteId, empresaId) {
    const cliente = await prisma.cliente.findFirst({
      where: { id: parseInt(clienteId, 10), empresaId },
    });

    if (!cliente) {
      const error = new Error('Cliente no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }
    return cliente;
  }

  /**
   * Valida que un equipo pertenezca a la empresa
   */
  async validarEquipo(equipoId, empresaId) {
    if (!equipoId) return null;

    const equipo = await prisma.equipo.findFirst({
      where: { id: parseInt(equipoId, 10), empresaId },
    });

    if (!equipo) {
      const error = new Error('Equipo no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }
    return equipo;
  }

  /**
   * Valida que el técnico pertenezca a la empresa y tenga rol válido
   */
  async validarTecnico(tecnicoId, empresaId) {
    if (!tecnicoId) return null;

    const tecnico = await prisma.usuario.findFirst({
      where: {
        id: parseInt(tecnicoId, 10),
        empresaId,
        rol: { in: ROLES_TECNICOS },
      },
    });

    if (!tecnico) {
      const error = new Error('Técnico no válido para esta empresa');
      error.status = 404;
      throw error;
    }
    return tecnico;
  }

  /**
   * Valida que un repuesto pertenezca a la empresa y tenga stock suficiente
   */
  async validarRepuesto(repuestoId, cantidad, empresaId) {
    const repuesto = await prisma.repuesto.findFirst({
      where: {
        id: parseInt(repuestoId, 10),
        empresaId,
        estado: true,
      },
    });

    if (!repuesto) {
      const error = new Error('Repuesto no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }

    if (repuesto.stock < cantidad) {
      const error = new Error(`Stock insuficiente. Disponible: ${repuesto.stock}, Solicitado: ${cantidad}`);
      error.status = 400;
      throw error;
    }

    return repuesto;
  }

  /**
   * Verifica que una orden no esté cerrada
   */
  verificarOrdenNoCerrada(orden) {
    if (ESTADOS_CERRADOS.includes(orden.estado)) {
      const error = new Error(`No se puede modificar una orden ${orden.estado}. La orden está cerrada.`);
      error.status = 400;
      throw error;
    }
  }

  /**
   * Calcula el costo final de una orden sumando todos los repuestos
   */
  async calcularCostoFinal(ordenId) {
    const repuestos = await prisma.repuestoOrden.findMany({
      where: { ordenId },
    });

    const costoFinal = repuestos.reduce((total, rep) => total + (rep.subtotal || 0), 0);

    return costoFinal;
  }

  /**
   * Lista órdenes con paginación y filtros
   */
  async listarOrdenes(empresaId, query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(query.limit, 10) || 10, 100);
    const skip = (page - 1) * limit;

    const where = {
      empresaId,
      ...(query.estado && ESTADOS_PERMITIDOS.includes(query.estado) && {
        estado: query.estado,
      }),
      ...(query.clienteId && {
        clienteId: parseInt(query.clienteId, 10),
      }),
      ...(query.tecnicoId && {
        tecnicoId: parseInt(query.tecnicoId, 10),
      }),
      ...(query.tipo && TIPOS_ORDEN.includes(query.tipo) && {
        tipo: query.tipo,
      }),
    };

    const [total, ordenes] = await Promise.all([
      prisma.ordenTrabajo.count({ where }),
      prisma.ordenTrabajo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          cliente: {
            select: { id: true, nombre: true, contacto: true },
          },
          equipo: {
            select: { id: true, nombre: true, codigoQR: true },
          },
          tecnico: {
            select: { id: true, nombre: true, email: true },
          },
          _count: {
            select: {
              repuestoUso: true,
            },
          },
        },
      }),
    ]);

    return {
      data: ordenes,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Crea una nueva orden de trabajo
   */
  async crearOrden(datosOrden, empresaId, usuarioId) {
    const {
      clienteId,
      equipoId,
      tecnicoId,
      titulo,
      descripcion,
      diagnostico,
      tipo,
      prioridad,
      fechaInicio,
      observaciones,
      costoEstimado,
    } = datosOrden;

    if (!clienteId) {
      const error = new Error('El cliente es obligatorio');
      error.status = 400;
      throw error;
    }

    if (!descripcion) {
      const error = new Error('La descripción del trabajo es obligatoria');
      error.status = 400;
      throw error;
    }

    if (tipo && !TIPOS_ORDEN.includes(tipo)) {
      const error = new Error(`Tipo de orden inválido. Valores permitidos: ${TIPOS_ORDEN.join(', ')}`);
      error.status = 400;
      throw error;
    }

    if (prioridad && !PRIORIDADES.includes(prioridad)) {
      const error = new Error(`Prioridad inválida. Valores permitidos: ${PRIORIDADES.join(', ')}`);
      error.status = 400;
      throw error;
    }

    await this.validarCliente(clienteId, empresaId);
    await this.validarEquipo(equipoId, empresaId);
    await this.validarTecnico(tecnicoId, empresaId);

    const codigo = await this.generarCodigoOrden(empresaId);

    const nuevaOrden = await prisma.ordenTrabajo.create({
      data: {
        codigo,
        empresaId,
        clienteId: parseInt(clienteId, 10),
        equipoId: equipoId ? parseInt(equipoId, 10) : null,
        tecnicoId: tecnicoId ? parseInt(tecnicoId, 10) : null,
        titulo,
        descripcion,
        diagnostico: diagnostico || null,
        observaciones,
        tipo: tipo || 'CORRECTIVO',
        prioridad: prioridad || 'MEDIA',
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(), // Automático si no viene
        costoEstimado,
      },
      include: {
        cliente: {
          select: { id: true, nombre: true },
        },
        equipo: {
          select: { id: true, nombre: true, codigoQR: true },
        },
        tecnico: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    // Registrar historial inicial
    await prisma.statusHistory.create({
      data: {
        ordenId: nuevaOrden.id,
        usuarioId,
        estadoAnterior: null,
        estadoNuevo: nuevaOrden.estado,
        comentario: 'Orden creada',
      },
    });

    return nuevaOrden;
  }

  /**
   * Obtiene detalle de una orden por ID
   */
  async obtenerOrdenPorId(id, empresaId) {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: parseInt(id, 10), empresaId },
      include: {
        cliente: true,
        equipo: {
          include: {
            tipoEquipo: true,
            cliente: {
              select: { id: true, nombre: true },
            },
          },
        },
        tecnico: {
          select: { id: true, nombre: true, email: true, telefono: true },
        },
        repuestoUso: {
          include: {
            repuesto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
                descripcion: true,
              },
            },
          },
          orderBy: { creadoEn: 'desc' },
        },
        statusHistory: {
          orderBy: { creadoEn: 'desc' },
          include: {
            usuario: {
              select: { id: true, nombre: true, email: true },
            },
          },
        },
      },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    return orden;
  }

  /**
   * Actualiza una orden (para editar diagnóstico, observaciones, etc.)
   */
  async actualizarOrden(id, empresaId, datosActualizacion) {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: parseInt(id, 10), empresaId },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    // Si la orden está cerrada, solo permitir actualizar ciertos campos
    if (ESTADOS_CERRADOS.includes(orden.estado)) {
      const camposPermitidos = ['observaciones']; // Solo observaciones se pueden editar en órdenes cerradas
      const camposSolicitados = Object.keys(datosActualizacion);
      const camposNoPermitidos = camposSolicitados.filter(campo => !camposPermitidos.includes(campo));
      
      if (camposNoPermitidos.length > 0) {
        const error = new Error(`No se puede editar ${camposNoPermitidos.join(', ')} en una orden ${orden.estado}`);
        error.status = 400;
        throw error;
      }
    }

    const datosUpdate = {};
    if (datosActualizacion.diagnostico !== undefined) datosUpdate.diagnostico = datosActualizacion.diagnostico;
    if (datosActualizacion.observaciones !== undefined) datosUpdate.observaciones = datosActualizacion.observaciones;
    if (datosActualizacion.titulo !== undefined) datosUpdate.titulo = datosActualizacion.titulo;
    if (datosActualizacion.descripcion !== undefined) datosUpdate.descripcion = datosActualizacion.descripcion;
    if (datosActualizacion.costoEstimado !== undefined) datosUpdate.costoEstimado = datosActualizacion.costoEstimado;

    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id: orden.id },
      data: datosUpdate,
      include: {
        cliente: true,
        equipo: true,
        tecnico: {
          select: { id: true, nombre: true, email: true },
        },
        repuestoUso: {
          include: {
            repuesto: {
              select: {
                id: true,
                nombre: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    return ordenActualizada;
  }

  /**
   * Cambia el estado de una orden y registra historial
   */
  async cambiarEstado(id, empresaId, nuevoEstado, usuarioId, comentario) {
    if (!ESTADOS_PERMITIDOS.includes(nuevoEstado)) {
      const error = new Error(`Estado inválido. Valores permitidos: ${ESTADOS_PERMITIDOS.join(', ')}`);
      error.status = 400;
      throw error;
    }

    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: parseInt(id, 10), empresaId },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    if (orden.estado === nuevoEstado) {
      const error = new Error('La orden ya tiene este estado');
      error.status = 400;
      throw error;
    }

    const datosUpdate = { estado: nuevoEstado };
    
    // Si se cierra la orden (FINALIZADA o CANCELADA), registrar fechaFin
    if (ESTADOS_CERRADOS.includes(nuevoEstado) && !orden.fechaFin) {
      datosUpdate.fechaFin = new Date();
    }

    // Si se reabre una orden cerrada, limpiar fechaFin
    if (!ESTADOS_CERRADOS.includes(nuevoEstado) && orden.fechaFin) {
      datosUpdate.fechaFin = null;
    }

    // Calcular costoFinal antes de cerrar
    if (ESTADOS_CERRADOS.includes(nuevoEstado)) {
      const costoFinal = await this.calcularCostoFinal(orden.id);
      datosUpdate.costoFinal = costoFinal;
    }

    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id: orden.id },
      data: datosUpdate,
      include: {
        cliente: true,
        equipo: true,
        tecnico: true,
      },
    });

    await prisma.statusHistory.create({
      data: {
        ordenId: orden.id,
        usuarioId,
        estadoAnterior: orden.estado,
        estadoNuevo: nuevoEstado,
        comentario: comentario || `Estado actualizado a ${nuevoEstado}`,
      },
    });

    return ordenActualizada;
  }

  /**
   * Asigna un técnico a la orden
   */
  async asignarTecnico(id, empresaId, tecnicoId) {
    if (!tecnicoId) {
      const error = new Error('El técnico es obligatorio');
      error.status = 400;
      throw error;
    }

    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: parseInt(id, 10), empresaId },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    this.verificarOrdenNoCerrada(orden);

    const tecnico = await this.validarTecnico(tecnicoId, empresaId);

    const ordenActualizada = await prisma.ordenTrabajo.update({
      where: { id: orden.id },
      data: { tecnicoId: tecnico.id },
      include: {
        cliente: true,
        equipo: true,
        tecnico: {
          select: { id: true, nombre: true, email: true },
        },
      },
    });

    return ordenActualizada;
  }

  /**
   * Agrega un repuesto a una orden
   * CRÍTICO: Crea movimiento SALIDA y actualiza stock
   */
  async agregarRepuesto(ordenId, empresaId, repuestoId, cantidad, usuarioId) {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: parseInt(ordenId, 10), empresaId },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    this.verificarOrdenNoCerrada(orden);

    const cantidadNum = parseInt(cantidad, 10);
    if (cantidadNum <= 0) {
      const error = new Error('La cantidad debe ser mayor a cero');
      error.status = 400;
      throw error;
    }

    // Validar repuesto y stock
    const repuesto = await this.validarRepuesto(repuestoId, cantidadNum, empresaId);

    // Verificar si el repuesto ya está en la orden
    const repuestoExistente = await prisma.repuestoOrden.findFirst({
      where: {
        ordenId: orden.id,
        repuestoId: repuesto.id,
      },
    });

    // Usar costo promedio actual del repuesto como precio unitario
    const unitPrice = repuesto.costoPromedio > 0 ? repuesto.costoPromedio : repuesto.precioUnit;
    const subtotal = cantidadNum * unitPrice;

    // Transacción: Crear RepuestoOrden + Movimiento SALIDA + Actualizar stock + Actualizar costoFinal
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Crear o actualizar RepuestoOrden
      let repuestoOrden;
      if (repuestoExistente) {
        // Si ya existe, actualizar cantidad y subtotal
        const nuevaCantidad = repuestoExistente.cantidad + cantidadNum;
        const nuevoSubtotal = nuevaCantidad * unitPrice;
        
        repuestoOrden = await tx.repuestoOrden.update({
          where: { id: repuestoExistente.id },
          data: {
            cantidad: nuevaCantidad,
            subtotal: nuevoSubtotal,
          },
        });
      } else {
        // Si no existe, crear nuevo
        repuestoOrden = await tx.repuestoOrden.create({
          data: {
            ordenId: orden.id,
            repuestoId: repuesto.id,
            cantidad: cantidadNum,
            unitPrice,
            subtotal,
          },
        });
      }

      // 2. Crear movimiento SALIDA en inventario
      await repuestosService.crearMovimiento({
        repuestoId: repuesto.id,
        empresaId,
        tipo: 'SALIDA',
        cantidad: cantidadNum,
        nota: `Uso en orden ${orden.codigo}`,
        userId: usuarioId,
      });

      // 3. Actualizar costoFinal de la orden
      const nuevoCostoFinal = await this.calcularCostoFinal(orden.id);
      await tx.ordenTrabajo.update({
        where: { id: orden.id },
        data: { costoFinal: nuevoCostoFinal },
      });

      return repuestoOrden;
    });

    // Obtener el repuestoOrden completo con relaciones
    const repuestoOrdenCompleto = await prisma.repuestoOrden.findUnique({
      where: { id: resultado.id },
      include: {
        repuesto: {
          select: {
            id: true,
            nombre: true,
            sku: true,
            descripcion: true,
          },
        },
      },
    });

    return repuestoOrdenCompleto;
  }

  /**
   * Quita un repuesto de una orden
   * CRÍTICO: Revierte el movimiento con AJUSTE y devuelve stock
   */
  async quitarRepuesto(ordenId, empresaId, itemId, usuarioId) {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: parseInt(ordenId, 10), empresaId },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    this.verificarOrdenNoCerrada(orden);

    const repuestoOrden = await prisma.repuestoOrden.findFirst({
      where: {
        id: parseInt(itemId, 10),
        ordenId: orden.id,
      },
      include: {
        repuesto: true,
      },
    });

    if (!repuestoOrden) {
      const error = new Error('Repuesto no encontrado en esta orden');
      error.status = 404;
      throw error;
    }

    // Transacción: Eliminar RepuestoOrden + Crear movimiento AJUSTE (devolución) + Actualizar costoFinal
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar RepuestoOrden
      await tx.repuestoOrden.delete({
        where: { id: repuestoOrden.id },
      });

      // 2. Crear movimiento AJUSTE positivo (devolución de stock)
      // Usar el unitPrice guardado en RepuestoOrden para el ajuste
      await repuestosService.crearMovimiento({
        repuestoId: repuestoOrden.repuestoId,
        empresaId,
        tipo: 'AJUSTE',
        cantidad: repuestoOrden.cantidad, // Cantidad positiva para devolver
        nota: `Devolución de orden ${orden.codigo}`,
        userId: usuarioId,
        unitCost: repuestoOrden.unitPrice, // Usar el precio original
      });

      // 3. Actualizar costoFinal de la orden
      const nuevoCostoFinal = await this.calcularCostoFinal(orden.id);
      await tx.ordenTrabajo.update({
        where: { id: orden.id },
        data: { costoFinal: nuevoCostoFinal },
      });
    });

    return { eliminado: true, repuestoId: repuestoOrden.repuestoId, cantidad: repuestoOrden.cantidad };
  }
}

module.exports = new OrdenesService();
