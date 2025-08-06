import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { documentoService } from '../../services/documento.service';
import { geminiService } from '../../services/gemini.service';
import { coherenciaService } from '../../services/coherencia.service';
import { DocumentoService } from './documento.service';
import { Documento } from './documento.model';
import { DocumentoTipo } from './documentoTipo.model';
import { Cliente } from '../cliente/cliente.model';
import { logInfo, logError, logDebug } from '../../config/logger';
import { 
  createDocumentoSchema, 
  updateDocumentoSchema,
  reviewDocumentoSchema,
  documentoIdSchema, 
  documentoFilterSchema,
  documentoTipoFilterSchema 
} from './documento.schema';

export class DocumentoController {
  // Crear documento
  public static createDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createDocumentoSchema.parse(req.body);
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(validatedData.cliente_id);
    
    if (!cliente) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }
    
    // Verificar que el tipo de documento existe
    const tipoDocumento = await DocumentoTipo.findByPk(validatedData.documento_tipo_id);
    
    if (!tipoDocumento) {
      res.status(404).json({
        success: false,
        message: 'Tipo de documento no encontrado',
      });
      return;
    }
    
    // Verificar que el tipo de documento aplica al tipo de persona
    const aplicaTipoPersona = tipoDocumento.aplicaATipoPersona(cliente.tipo_persona);
    
    if (!aplicaTipoPersona) {
      res.status(400).json({
        success: false,
        message: `El documento ${tipoDocumento.nombre} no aplica para ${cliente.tipo_persona}`,
      });
      return;
    }
    
    // Convertir fechas
    const documentoData = {
      ...validatedData,
      fecha_documento: new Date(validatedData.fecha_documento),
      fecha_expiracion: validatedData.fecha_expiracion ? new Date(validatedData.fecha_expiracion) : undefined,
      estatus: 'pendiente' as const,
    };
    
    // Calcular fecha de expiración si no se proporciona y el documento tiene vigencia
    if (!documentoData.fecha_expiracion && tipoDocumento.vigencia_dias) {
      documentoData.fecha_expiracion = new Date(documentoData.fecha_documento);
      documentoData.fecha_expiracion.setDate(documentoData.fecha_expiracion.getDate() + tipoDocumento.vigencia_dias);
    }
    
    const documento = await Documento.create(documentoData);
    
    logInfo('Documento creado exitosamente', { 
      documento_id: documento.documento_id,
      cliente_id: documento.cliente_id,
      tipo: tipoDocumento.nombre 
    });
    
    res.status(201).json({
      success: true,
      message: 'Documento creado exitosamente',
      data: documento,
    });
  });

  // Obtener todos los documentos con filtros
  public static getDocumentos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = documentoFilterSchema.parse(req.query);
    const { page, limit, fecha_desde, fecha_hasta, ...whereClause } = filters;
    
    const offset = (page - 1) * limit;
    
    // Agregar filtros de fecha si existen
    let whereCondition: any = { ...whereClause };
    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha_subida = {};
      if (fecha_desde) whereCondition.fecha_subida.gte = new Date(fecha_desde);
      if (fecha_hasta) whereCondition.fecha_subida.lte = new Date(fecha_hasta);
    }
    
    const { count, rows } = await Documento.findAndCountAll({
      where: whereCondition,
      include: [
        { model: Cliente, as: 'clienteDocumento' },
        { model: DocumentoTipo, as: 'tipo' },
      ],
      limit,
      offset,
      order: [['fecha_subida', 'DESC']],
    });
    
    res.json({
      success: true,
      data: {
        documentos: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  });

  // Obtener documento por ID
  public static getDocumentoById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = documentoIdSchema.parse(req.params);
    
    const documento = await Documento.findByPk(id, {
      include: [
        { model: Cliente, as: 'clienteDocumento' },
        { model: DocumentoTipo, as: 'tipo' },
      ],
    });
    
    if (!documento) {
      res.status(404).json({
        success: false,
        message: 'Documento no encontrado',
      });
      return;
    }
    
    res.json({
      success: true,
      data: documento,
    });
  });

  // Actualizar documento
  public static updateDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = documentoIdSchema.parse(req.params);
    const validatedData = updateDocumentoSchema.parse(req.body);
    
    const documento = await Documento.findByPk(id);
    
    if (!documento) {
      res.status(404).json({
        success: false,
        message: 'Documento no encontrado',
      });
      return;
    }
    
    // Convertir fechas
    const updateData = {
      ...validatedData,
      fecha_documento: validatedData.fecha_documento ? new Date(validatedData.fecha_documento) : undefined,
      fecha_expiracion: validatedData.fecha_expiracion ? new Date(validatedData.fecha_expiracion) : undefined,
    };
    
    await documento.update(updateData);
    
    res.json({
      success: true,
      message: 'Documento actualizado exitosamente',
      data: documento,
    });
  });

  // Revisar documento (aprobar/rechazar)
  public static reviewDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = documentoIdSchema.parse(req.params);
    const validatedData = reviewDocumentoSchema.parse(req.body);
    
    const documento = await Documento.findByPk(id);
    
    if (!documento) {
      res.status(404).json({
        success: false,
        message: 'Documento no encontrado',
      });
      return;
    }
    
    if (documento.estatus !== 'pendiente') {
      res.status(400).json({
        success: false,
        message: 'El documento ya ha sido revisado',
      });
      return;
    }
    
    await documento.update(validatedData);
    
    res.json({
      success: true,
      message: `Documento ${validatedData.estatus} exitosamente`,
      data: documento,
    });
  });

  // Eliminar documento
  public static deleteDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = documentoIdSchema.parse(req.params);
    
    const documento = await Documento.findByPk(id);
    
    if (!documento) {
      res.status(404).json({
        success: false,
        message: 'Documento no encontrado',
      });
      return;
    }
    
    await documento.destroy();
    
    res.json({
      success: true,
      message: 'Documento eliminado exitosamente',
    });
  });

  // Obtener tipos de documento
  public static getTiposDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = documentoTipoFilterSchema.parse(req.query);
    
    let whereClause: any = {};
    
    if (filters.tipo_persona) {
      switch (filters.tipo_persona) {
        case 'PF':
          whereClause.aplica_pf = true;
          break;
        case 'PF_AE':
          whereClause.aplica_pfae = true;
          break;
        case 'PM':
          whereClause.aplica_pm = true;
          break;
      }
    }
    
    if (filters.opcional !== undefined) {
      whereClause.opcional = filters.opcional;
    }
    
    const tipos = await DocumentoTipo.findAll({
      where: whereClause,
      order: [['nombre', 'ASC']],
    });
    
    res.json({
      success: true,
      data: tipos,
    });
  });

  // Verificar documentos vencidos
  public static getDocumentosVencidos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const hoy = new Date();
    
    const documentosVencidos = await Documento.findAll({
      where: {
        fecha_expiracion: {
          lt: hoy,
        },
        estatus: {
          ne: 'vencido',
        },
      },
      include: [
        { model: Cliente, as: 'clienteDocumento' },
        { model: DocumentoTipo, as: 'tipo' },
      ],
    });
    
    // Actualizar estatus a vencido
    await Promise.all(
      documentosVencidos.map(doc => doc.update({ estatus: 'vencido' }))
    );
    
    res.json({
      success: true,
      data: documentosVencidos,
      message: `${documentosVencidos.length} documentos marcados como vencidos`,
    });
  });

  // Subir documento usando el servicio Gemini
  public static subirDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { clienteId, documentoTipoId, fechaDocumento, folioSolicitud, reemplazar } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No se proporcionó ningún archivo',
      });
      return;
    }

    try {
      // Subir el documento
      const documento = await documentoService.subirDocumento({
        clienteId: parseInt(clienteId),
        documentoTipoId: parseInt(documentoTipoId),
        file,
        fechaDocumento: new Date(fechaDocumento),
        folioSolicitud,
        reemplazar: reemplazar === 'true',
      });

      // Analizar el documento con Gemini
      const analysisResult = await geminiService.analyzeDocument(documento.documento_id.toString());

      // Analizar coherencia con datos del cliente
      const coherenciaResult = await coherenciaService.analizarCoherencia(parseInt(clienteId));

      res.status(201).json({
        success: true,
        message: 'Documento subido y analizado exitosamente',
        data: {
          documento,
          analysis: analysisResult,
          coherencia: coherenciaResult,
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Obtener documentos faltantes
  public static getDocumentosFaltantes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { clienteId } = req.params;
    const { folioSolicitud } = req.query;

    const documentosFaltantes = await documentoService.getDocumentosFaltantes(
      parseInt(clienteId),
      folioSolicitud as string
    );

    res.json({
      success: true,
      data: documentosFaltantes,
    });
  });

  // Verificar completitud
  public static verificarCompletitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { clienteId } = req.params;
    const { folioSolicitud } = req.query;

    const completitud = await documentoService.verificarCompletitud(
      parseInt(clienteId),
      folioSolicitud as string
    );

    res.json({
      success: true,
      data: completitud,
    });
  });

  // Regenerar URL de documento
  public static regenerarUrlDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documentoId } = req.params;

    try {
      const nuevaUrl = await documentoService.regenerarUrlDocumento(parseInt(documentoId));

      res.json({
        success: true,
        message: 'URL regenerada exitosamente',
        data: { url: nuevaUrl },
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  });

  // Obtener documentos próximos a vencer
  public static getDocumentosProximosAVencer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { dias } = req.query;
    const diasAnticipacion = dias ? parseInt(dias as string) : 30;

    const documentos = await documentoService.getDocumentosProximosAVencer(diasAnticipacion);

    res.json({
      success: true,
      data: documentos,
    });
  });

  // Actualizar documentos vencidos (job manual)
  public static actualizarDocumentosVencidos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const actualizados = await documentoService.actualizarDocumentosVencidos();

    res.json({
      success: true,
      message: `${actualizados} documentos actualizados`,
      data: { documentosActualizados: actualizados },
    });
  });

  // ==================== ENDPOINTS ADMINISTRATIVOS NUEVOS ====================

  /**
   * Obtener estadísticas generales de documentos para dashboard
   */
  public static getEstadisticasGenerales = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filtros = {
      fechaInicio: req.query.fechaInicio ? new Date(req.query.fechaInicio as string) : undefined,
      fechaFin: req.query.fechaFin ? new Date(req.query.fechaFin as string) : undefined,
      tipoPersona: req.query.tipoPersona as 'PF' | 'PF_AE' | 'PM' | undefined
    };
    
    const estadisticas = await DocumentoService.getEstadisticasGenerales(filtros);
    
    res.json({
      success: true,
      message: 'Estadísticas obtenidas exitosamente',
      data: estadisticas,
    });
  });

  /**
   * Obtener estadísticas por tipo de documento
   */
  public static getEstadisticasPorTipo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filtros = {
      fechaInicio: req.query.fechaInicio ? new Date(req.query.fechaInicio as string) : undefined,
      fechaFin: req.query.fechaFin ? new Date(req.query.fechaFin as string) : undefined,
      tipoPersona: req.query.tipoPersona as 'PF' | 'PF_AE' | 'PM' | undefined
    };
    
    const estadisticas = await DocumentoService.getEstadisticasPorTipo(filtros);
    
    res.json({
      success: true,
      data: estadisticas,
    });
  });

  /**
   * Análisis consolidado de completitud para administradores
   */
  public static getAnalisisCompletitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filtros = {
      tipoPersona: req.query.tipoPersona as 'PF' | 'PF_AE' | 'PM' | undefined,
      umbralCompletitud: req.query.umbral ? parseInt(req.query.umbral as string) : 80
    };
    
    const analisis = await DocumentoService.getAnalisisCompletitudConsolidado(filtros);
    
    res.json({
      success: true,
      data: analisis,
    });
  });

  /**
   * Métricas del equipo de revisión
   */
  public static getMetricasEquipo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filtros = {
      fechaInicio: req.query.fechaInicio ? new Date(req.query.fechaInicio as string) : undefined,
      fechaFin: req.query.fechaFin ? new Date(req.query.fechaFin as string) : undefined
    };
    
    const metricas = await DocumentoService.getMetricasEquipoRevision(filtros);
    
    res.json({
      success: true,
      data: metricas,
    });
  });

  // ==================== GESTIÓN DE TIPOS DE DOCUMENTO ====================

  /**
   * Crear nuevo tipo de documento
   */
  public static createTipoDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = {
      nombre: req.body.nombre,
      descripcion: req.body.descripcion,
      aplica_pf: Boolean(req.body.aplica_pf),
      aplica_pfae: Boolean(req.body.aplica_pfae),
      aplica_pm: Boolean(req.body.aplica_pm),
      vigencia_dias: req.body.vigencia_dias ? parseInt(req.body.vigencia_dias) : undefined,
      opcional: Boolean(req.body.opcional),
      formatos_permitidos: req.body.formatos_permitidos || ['pdf'],
      tamano_maximo_mb: req.body.tamano_maximo_mb ? parseInt(req.body.tamano_maximo_mb) : 5
    };
    
    const tipoDocumento = await DocumentoService.createTipoDocumento(validatedData);
    
    logInfo('Tipo de documento creado', { 
      tipo_id: tipoDocumento.documento_tipo_id,
      nombre: tipoDocumento.nombre 
    });
    
    res.status(201).json({
      success: true,
      message: 'Tipo de documento creado exitosamente',
      data: tipoDocumento,
    });
  });

  /**
   * Actualizar tipo de documento
   */
  public static updateTipoDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = documentoIdSchema.parse(req.params);
    
    const updateData: any = {};
    if (req.body.nombre) updateData.nombre = req.body.nombre;
    if (req.body.descripcion !== undefined) updateData.descripcion = req.body.descripcion;
    if (req.body.aplica_pf !== undefined) updateData.aplica_pf = Boolean(req.body.aplica_pf);
    if (req.body.aplica_pfae !== undefined) updateData.aplica_pfae = Boolean(req.body.aplica_pfae);
    if (req.body.aplica_pm !== undefined) updateData.aplica_pm = Boolean(req.body.aplica_pm);
    if (req.body.vigencia_dias !== undefined) updateData.vigencia_dias = req.body.vigencia_dias ? parseInt(req.body.vigencia_dias) : null;
    if (req.body.opcional !== undefined) updateData.opcional = Boolean(req.body.opcional);
    if (req.body.formatos_permitidos) updateData.formatos_permitidos = req.body.formatos_permitidos;
    if (req.body.tamano_maximo_mb) updateData.tamano_maximo_mb = parseInt(req.body.tamano_maximo_mb);
    
    const tipoDocumento = await DocumentoService.updateTipoDocumento(id, updateData);
    
    res.json({
      success: true,
      message: 'Tipo de documento actualizado exitosamente',
      data: tipoDocumento,
    });
  });

  /**
   * Eliminar tipo de documento
   */
  public static deleteTipoDocumento = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = documentoIdSchema.parse(req.params);
    const forzar = req.query.forzar === 'true';
    
    const result = await DocumentoService.deleteTipoDocumento(id, forzar);
    
    res.json({
      success: true,
      message: result.message,
      data: { documentos_eliminados: result.documentos_eliminados },
    });
  });

  // ==================== OPERACIONES MASIVAS ====================

  /**
   * Revisar múltiples documentos en lote
   */
  public static revisarLoteDocumentos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { documento_ids, accion, comentario } = req.body;
    const revisorId = (req as any).user?.usuario_id;
    
    if (!Array.isArray(documento_ids) || documento_ids.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Se requiere un arreglo de IDs de documentos',
      });
      return;
    }
    
    if (!['aceptar', 'rechazar'].includes(accion)) {
      res.status(400).json({
        success: false,
        message: 'Acción debe ser "aceptar" o "rechazar"',
      });
      return;
    }
    
    const resultado = await DocumentoService.revisarDocumentosLote(
      documento_ids,
      accion,
      comentario,
      revisorId
    );
    
    res.json({
      success: true,
      message: `Lote procesado: ${resultado.procesados} documentos actualizados, ${resultado.errores} errores`,
      data: resultado,
    });
  });

  /**
   * Analizar coherencia entre datos del cliente y documentos
   */
  public static analizarCoherenciaCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { clienteId } = req.params;

    if (!clienteId || isNaN(parseInt(clienteId))) {
      res.status(400).json({
        success: false,
        message: 'ID de cliente inválido',
      });
      return;
    }

    try {
      const coherenciaResult = await coherenciaService.analizarCoherencia(parseInt(clienteId));

      res.json({
        success: true,
        message: 'Análisis de coherencia completado',
        data: coherenciaResult,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || 'Error al analizar coherencia',
      });
    }
  });

  /**
   * Exportar datos de documentos
   */
  public static exportarDatos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filtros = {
      fechaInicio: req.query.fechaInicio ? new Date(req.query.fechaInicio as string) : undefined,
      fechaFin: req.query.fechaFin ? new Date(req.query.fechaFin as string) : undefined,
      estatus: req.query.estatus ? (req.query.estatus as string).split(',') : undefined,
      tipoPersona: req.query.tipoPersona as 'PF' | 'PF_AE' | 'PM' | undefined,
      incluirDatosCliente: req.query.incluirCliente === 'true'
    };
    
    const exportData = await DocumentoService.exportarDatosDocumentos(filtros);
    
    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="documentos_export_${new Date().toISOString().split('T')[0]}.json"`);
    
    res.json({
      success: true,
      data: exportData,
    });
  });
}
