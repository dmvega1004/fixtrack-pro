const prisma = require('../../config/database');
const repuestosService = require('../repuestos/repuestos.service');
const PDFDocument = require('pdfkit');
const http = require('http');
const https = require('https');

const ESTADOS_PERMITIDOS = ['PENDIENTE', 'EN_PROCESO', 'TERMINADO', 'CANCELADA'];
const ESTADOS_CERRADOS = ['TERMINADO', 'CANCELADA']; // Estados que "congelan" la orden
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
    console.log(`Validando cliente con ID: ${clienteId} para la empresa ID: ${empresaId}`);
    const cliente = await prisma.cliente.findFirst({
      where: { id: parseInt(clienteId, 10), empresaId },
    });

    if (!cliente) {
      console.error(`Cliente no encontrado o no pertenece a la empresa. Cliente ID: ${clienteId}, Empresa ID: ${empresaId}`);
      const error = new Error('Cliente no encontrado o no pertenece a tu empresa');
      error.status = 404;
      throw error;
    }

    console.log(`Cliente validado exitosamente: ${JSON.stringify(cliente)}`);
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
    // 1. Extraemos SOLO los campos que necesitamos y conocemos
    // Filtrar campos no deseados del objeto datosOrden
    const camposValidos = [
      'clienteId', 'equipoId', 'tecnicoId', 'tituloProblema', 'descripcionProblema',
      'titulo', 'descripcion', 'diagnosticoTecnico', 'tipo', 'prioridad',
      'fechaInicio', 'observaciones', 'costoEstimado'
    ];

    const datosOrdenFiltrados = Object.keys(datosOrden)
      .filter((key) => camposValidos.includes(key))
      .reduce((obj, key) => {
        obj[key] = datosOrden[key];
        return obj;
      }, {});

    // Desestructurar los campos filtrados
    const {
      clienteId,
      equipoId,
      tecnicoId,
      tituloProblema,
      descripcionProblema,
      titulo,
      descripcion,
      diagnosticoTecnico,
      tipo,
      prioridad,
      fechaInicio,
      observaciones,
      costoEstimado,
    } = datosOrdenFiltrados;

    // 2. Validaciones de negocio
    if (!clienteId) {
      const error = new Error('El cliente es obligatorio');
      error.status = 400;
      throw error;
    }

    const descFinal = descripcionProblema || descripcion;
    const tituloFinal = tituloProblema || titulo;

    if (!descFinal) {
      const error = new Error('La descripción del problema es obligatoria');
      error.status = 400;
      throw error;
    }

    if (!tituloFinal) {
      const error = new Error('El título del problema es obligatorio');
      error.status = 400;
      throw error;
    }

    // 3. Validaciones de existencia
    await this.validarCliente(clienteId, empresaId);
    await this.validarEquipo(equipoId, empresaId);
    await this.validarTecnico(tecnicoId, empresaId);

    const codigo = await this.generarCodigoOrden(empresaId);

    // 4. Inserción limpia en la base de datos
    // NOTA: No usamos "...datosOrden" para evitar que campos como "existe" se filtren
    // Filtrar campos válidos para evitar propagación de campos no deseados como "existe"
    const datosOrdenFiltradosFinal = {
      codigo,
      empresaId: parseInt(empresaId, 10),
      clienteId: parseInt(clienteId, 10),
      equipoId: equipoId ? parseInt(equipoId, 10) : null,
      tecnicoId: tecnicoId ? parseInt(tecnicoId, 10) : null,
      tituloProblema: tituloFinal,
      descripcionProblema: descFinal,
      titulo: tituloFinal, // Mantenemos ambos por tu schema
      descripcion: descFinal,
      diagnosticoTecnico: diagnosticoTecnico || null,
      observaciones: observaciones || null,
      tipo: tipo || 'CORRECTIVO',
      prioridad: prioridad || 'MEDIA',
      fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
      costoEstimado: costoEstimado ? parseFloat(costoEstimado) : null,
    };

    const nuevaOrden = await prisma.ordenTrabajo.create({
      data: datosOrdenFiltradosFinal,
      include: {
        cliente: { select: { id: true, nombre: true } },
        equipo: { select: { id: true, nombre: true, codigoQR: true } },
        tecnico: { select: { id: true, nombre: true, email: true } },
      },
    });

    // Registrar historial inicial
    await prisma.statusHistory.create({
      data: {
        ordenId: nuevaOrden.id,
        usuarioId: parseInt(usuarioId, 10),
        estadoAnterior: null,
        estadoNuevo: nuevaOrden.estado,
        comentario: 'Orden creada',
      },
    });

    return nuevaOrden;
  }

  /**
   * Actualiza una orden de forma segura
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

    // Filtramos manualmente los datos para que no entre basura como "existe"
    const dataClean = {};
    const camposPermitidos = [
      'tituloProblema', 'descripcionProblema', 'titulo', 'descripcion',
      'diagnosticoTecnico', 'trabajoRealizado', 'horasManoObra', 
      'costoManoObra', 'fotosUrl', 'estado', 'notasCliente', 
      'firmaClienteUrl', 'costoEstimado', 'observaciones', 'prioridad'
    ];

    camposPermitidos.forEach(campo => {
      if (datosActualizacion[campo] !== undefined) {
        if (campo === 'horasManoObra' || campo === 'costoManoObra' || campo === 'costoEstimado') {
          dataClean[campo] = parseFloat(datosActualizacion[campo]) || 0;
        } else {
          dataClean[campo] = datosActualizacion[campo];
        }
      }
    });

    return await prisma.ordenTrabajo.update({
      where: { id: orden.id },
      data: dataClean,
      include: {
        cliente: true,
        equipo: true,
        tecnico: { select: { id: true, nombre: true, email: true } },
      }
    });
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
    // Paso1
    if (datosActualizacion.tituloProblema !== undefined) datosUpdate.tituloProblema = datosActualizacion.tituloProblema;
    if (datosActualizacion.descripcionProblema !== undefined) datosUpdate.descripcionProblema = datosActualizacion.descripcionProblema;
    // Compatibilidad
    if (datosActualizacion.titulo !== undefined) datosUpdate.titulo = datosActualizacion.titulo;
    if (datosActualizacion.descripcion !== undefined) datosUpdate.descripcion = datosActualizacion.descripcion;
    // Paso2
    if (datosActualizacion.diagnosticoTecnico !== undefined) datosUpdate.diagnosticoTecnico = datosActualizacion.diagnosticoTecnico;
    if (datosActualizacion.trabajoRealizado !== undefined) datosUpdate.trabajoRealizado = datosActualizacion.trabajoRealizado;
    if (datosActualizacion.horasManoObra !== undefined) datosUpdate.horasManoObra = parseFloat(datosActualizacion.horasManoObra) || 0;
    if (datosActualizacion.costoManoObra !== undefined) datosUpdate.costoManoObra = parseFloat(datosActualizacion.costoManoObra) || 0;
    if (datosActualizacion.fotosUrl !== undefined) datosUpdate.fotosUrl = datosActualizacion.fotosUrl;
    // Paso3
    if (datosActualizacion.estado !== undefined) datosUpdate.estado = datosActualizacion.estado;
    if (datosActualizacion.notasCliente !== undefined) datosUpdate.notasCliente = datosActualizacion.notasCliente;
    if (datosActualizacion.firmaClienteUrl !== undefined) datosUpdate.firmaClienteUrl = datosActualizacion.firmaClienteUrl;
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
    
    // Si se cierra la orden (TERMINADO o CANCELADA), registrar fechaFin
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

  /**
   * Genera un PDF con la factura de la orden y devuelve un Buffer
   */
  async generateInvoicePDF(id, empresaId) {
    // Reutiliza la obtención de orden para validar existencia y permisos
    const orden = await this.obtenerOrdenPorId(id, empresaId);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    const finished = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // HEADER / TITULO
    doc.fontSize(18).text(`Factura Orden de Trabajo #${orden.codigo}`, { align: 'center' });
    doc.moveDown();

    // Datos cliente y fechas
    doc.fontSize(12).text(`Cliente: ${orden.cliente?.nombre || 'N/D'}`);
    doc.text(`Código OT: ${orden.codigo}`);
    doc.text(`Fecha inicio: ${orden.fechaInicio ? new Date(orden.fechaInicio).toLocaleString() : 'N/D'}`);
    if (orden.fechaFin) doc.text(`Fecha fin: ${new Date(orden.fechaFin).toLocaleString()}`);
    doc.moveDown();

    // Resumen del trabajo
    doc.fontSize(14).text('Resumen del Trabajo', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(orden.trabajoRealizado || orden.diagnosticoTecnico || 'No informado');
    doc.moveDown();

    // Repuestos
    doc.fontSize(14).text('Repuestos', { underline: true });
    doc.moveDown(0.5);

    let repuestosTotal = 0;
    if (orden.repuestoUso && orden.repuestoUso.length > 0) {
      orden.repuestoUso.forEach((item) => {
        const nombre = item.repuesto?.nombre || 'Repuesto';
        const cantidad = item.cantidad || 0;
        const unitPrice = typeof item.unitPrice !== 'undefined' ? item.unitPrice : 0;
        const subtotal = typeof item.subtotal !== 'undefined' ? item.subtotal : cantidad * unitPrice;
        repuestosTotal += subtotal || 0;
        doc.fontSize(12).text(`${nombre} — Cant: ${cantidad} — P.U.: ${unitPrice.toFixed(2)} — Subtotal: ${subtotal.toFixed(2)}`);
      });
    } else {
      doc.fontSize(12).text('No se usaron repuestos en esta orden.');
    }

    doc.moveDown();

    // Costos
    const manoObra = parseFloat(orden.costoManoObra || 0);
    // Preferir costoFinal si está calculado
    const costoRepuestos = orden.costoFinal ? parseFloat(orden.costoFinal || 0) : repuestosTotal;
    const total = (costoRepuestos || 0) + (manoObra || 0);

    doc.fontSize(12).text(`Costo Mano de Obra: ${manoObra.toFixed(2)}`);
    doc.text(`Costo Repuestos: ${costoRepuestos.toFixed(2)}`);
    doc.moveDown(0.5);
    doc.fontSize(14).text(`Total: ${total.toFixed(2)}`);

    doc.moveDown();

    // Firma del cliente (si existe)
    if (orden.firmaClienteUrl) {
      try {
        const fetchImageBuffer = (url) => new Promise((resolve, reject) => {
          try {
            const parsed = new URL(url);
            const client = parsed.protocol === 'https:' ? https : http;
            client.get(url, (res) => {
              const data = [];
              res.on('data', (chunk) => data.push(chunk));
              res.on('end', () => resolve(Buffer.concat(data)));
              res.on('error', reject);
            }).on('error', reject);
          } catch (err) {
            reject(err);
          }
        });

        const imgBuf = await fetchImageBuffer(orden.firmaClienteUrl);
        if (imgBuf && imgBuf.length > 0) {
          doc.moveDown();
          doc.fontSize(12).text('Firma cliente:');
          doc.image(imgBuf, { width: 150 });
        }
      } catch (err) {
        // Si falla la descarga/embedding de la imagen, continuar sin romper el PDF
        console.warn('No se pudo incluir la imagen de firma:', err.message || err);
      }
    }

    doc.end();

    const buffer = await finished;
    return buffer;
  }

  /**
   * Elimina una orden de trabajo y todos sus registros relacionados
   * CRÍTICO: Usa transacción para mantener integridad referencial
   */
  async eliminarOrden(id, empresaId) {
    // 1. Validar que la orden exista y pertenezca a la empresa
    const orden = await prisma.ordenTrabajo.findFirst({
      where: {
        id: parseInt(id, 10),
        empresaId: parseInt(empresaId, 10),
      },
    });

    if (!orden) {
      const error = new Error('Orden no encontrada');
      error.status = 404;
      throw error;
    }

    // 2. Transacción para eliminar registros relacionados en orden correcto
    await prisma.$transaction(async (tx) => {
      // 2.1. Eliminar historial de estados
      await tx.statusHistory.deleteMany({
        where: { ordenId: orden.id },
      });

      // 2.2. Eliminar repuestos vinculados (RepuestoOrden)
      await tx.repuestoOrden.deleteMany({
        where: { ordenId: orden.id },
      });

      // 2.3. Eliminar adjuntos (archivos asociados)
      await tx.adjunto.deleteMany({
        where: { ordenId: orden.id },
      });

      // 2.4. Finalmente, eliminar la orden principal
      await tx.ordenTrabajo.delete({
        where: { id: orden.id },
      });
    });

    return { eliminado: true, ordenId: orden.id };
  }
}

module.exports = new OrdenesService();
