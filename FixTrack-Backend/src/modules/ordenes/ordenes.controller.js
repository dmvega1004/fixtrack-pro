const ordenesService = require('./ordenes.service');

class OrdenesController {
  /**
   * GET /api/ordenes
   * Lista órdenes con paginación y filtros
   */
  async listar(req, res, next) {
    try {
      const resultado = await ordenesService.listarOrdenes(req.user.empresaId, req.query);

      res.status(200).json({
        success: true,
        message: 'Órdenes obtenidas exitosamente',
        ...resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ordenes
   * Crea una nueva orden de trabajo
   */
  async crear(req, res, next) {
    try {
      // Filtrar campos no deseados del cuerpo de la solicitud
      const camposValidos = [
        'clienteId', 'equipoId', 'tecnicoId', 'tituloProblema', 'descripcionProblema',
        'titulo', 'descripcion', 'diagnosticoTecnico', 'tipo', 'prioridad',
        'fechaInicio', 'observaciones', 'costoEstimado'
      ];

      const datosFiltrados = Object.keys(req.body)
        .filter((key) => camposValidos.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {});

      const nuevaOrden = await ordenesService.crearOrden(
        datosFiltrados,
        req.user.empresaId,
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Orden creada exitosamente',
        data: nuevaOrden,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ordenes/:id
   * Obtiene el detalle completo de una orden
   */
  async obtenerPorId(req, res, next) {
    try {
      const orden = await ordenesService.obtenerOrdenPorId(req.params.id, req.user.empresaId);

      res.status(200).json({
        success: true,
        message: 'Orden obtenida exitosamente',
        data: orden,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/ordenes/:id/factura
   * Genera y descarga la factura en PDF de la orden
   */
  async descargarFactura(req, res, next) {
    try {
      const pdfBuffer = await ordenesService.generateInvoicePDF(req.params.id, req.user.empresaId);

      const filename = `factura-${req.params.id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/ordenes/:id
   * Actualiza una orden (diagnóstico, observaciones, etc.)
   */
  async actualizar(req, res, next) {
    try {
      const {
        // Paso1
        tituloProblema,
        descripcionProblema,
        // compatibilidad
        titulo,
        descripcion,
        // Paso2
        diagnosticoTecnico,
        trabajoRealizado,
        horasManoObra,
        costoManoObra,
        fotosUrl,
        // Paso3
        estado,
        notasCliente,
        firmaClienteUrl,
        observaciones,
        costoEstimado,
      } = req.body;

      const ordenActualizada = await ordenesService.actualizarOrden(
        req.params.id,
        req.user.empresaId,
        {
          tituloProblema,
          descripcionProblema,
          titulo,
          descripcion,
          diagnosticoTecnico,
          trabajoRealizado,
          horasManoObra,
          costoManoObra,
          fotosUrl,
          estado,
          notasCliente,
          firmaClienteUrl,
          observaciones,
          costoEstimado,
        }
      );

      res.status(200).json({
        success: true,
        message: 'Orden actualizada exitosamente',
        data: ordenActualizada,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/ordenes/:id/estado
   * Cambia el estado de una orden
   */
  async cambiarEstado(req, res, next) {
    try {
      const { estado, comentario } = req.body;
      if (!estado) {
        return res.status(400).json({
          success: false,
          error: 'El estado es obligatorio',
        });
      }

      const ordenActualizada = await ordenesService.cambiarEstado(
        req.params.id,
        req.user.empresaId,
        estado,
        req.user.id,
        comentario,
      );

      res.status(200).json({
        success: true,
        message: 'Estado actualizado exitosamente',
        data: ordenActualizada,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/ordenes/:id/asignar
   * Asigna un técnico a la orden
   */
  async asignarTecnico(req, res, next) {
    try {
      const { tecnicoId } = req.body;
      if (!tecnicoId) {
        return res.status(400).json({
          success: false,
          error: 'El técnico es obligatorio',
        });
      }

      const ordenActualizada = await ordenesService.asignarTecnico(
        req.params.id,
        req.user.empresaId,
        tecnicoId,
      );

      res.status(200).json({
        success: true,
        message: 'Técnico asignado exitosamente',
        data: ordenActualizada,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/ordenes/:id/repuestos
   * Agrega un repuesto a una orden
   * CRÍTICO: Crea movimiento SALIDA y actualiza stock
   */
  async agregarRepuesto(req, res, next) {
    try {
      const { repuestoId, cantidad } = req.body;

      if (!repuestoId || !cantidad) {
        return res.status(400).json({
          success: false,
          error: 'repuestoId y cantidad son obligatorios',
        });
      }

      const repuestoOrden = await ordenesService.agregarRepuesto(
        req.params.id,
        req.user.empresaId,
        repuestoId,
        cantidad,
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Repuesto agregado a la orden exitosamente',
        data: repuestoOrden,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/ordenes/:id/repuestos/:itemId
   * Quita un repuesto de una orden
   * CRÍTICO: Revierte movimiento con AJUSTE y devuelve stock
   */
  async quitarRepuesto(req, res, next) {
    try {
      const { itemId } = req.params;

      const resultado = await ordenesService.quitarRepuesto(
        req.params.id,
        req.user.empresaId,
        itemId,
        req.user.id
      );

      res.status(200).json({
        success: true,
        message: 'Repuesto eliminado de la orden exitosamente',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/ordenes/:id
   * Elimina una orden de trabajo y todos sus registros relacionados
   */
  async eliminar(req, res, next) {
    try {
      const { id } = req.params;
      const empresaId = req.user.empresaId;

      await ordenesService.eliminarOrden(id, empresaId);

      res.status(200).json({
        success: true,
        message: 'Orden eliminada correctamente',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrdenesController();