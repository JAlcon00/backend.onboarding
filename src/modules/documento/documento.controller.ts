import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { documentoService } from '../../services/documento.service';
import { Documento } from './documento.model';
import { DocumentoTipo } from './documentoTipo.model';
import { Cliente } from '../cliente/cliente.model';
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
    console.log('🔍 DEBUG: Datos recibidos para crear documento:', req.body);
    
    const validatedData = createDocumentoSchema.parse(req.body);
    console.log('🔍 DEBUG: Datos validados:', validatedData);
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(validatedData.cliente_id);
    console.log('🔍 DEBUG: Cliente encontrado:', cliente ? `ID: ${cliente.cliente_id}, tipo: ${cliente.tipo_persona}` : 'No encontrado');
    
    if (!cliente) {
      console.log('❌ DEBUG: Cliente no encontrado');
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }
    
    // Verificar que el tipo de documento existe
    const tipoDocumento = await DocumentoTipo.findByPk(validatedData.documento_tipo_id);
    console.log('🔍 DEBUG: Tipo de documento encontrado:', tipoDocumento ? `ID: ${tipoDocumento.documento_tipo_id}, nombre: ${tipoDocumento.nombre}, aplica_pf: ${tipoDocumento.aplica_pf}` : 'No encontrado');
    
    if (!tipoDocumento) {
      console.log('❌ DEBUG: Tipo de documento no encontrado');
      res.status(404).json({
        success: false,
        message: 'Tipo de documento no encontrado',
      });
      return;
    }
    
    // Verificar que el tipo de documento aplica al tipo de persona
    const aplicaTipoPersona = tipoDocumento.aplicaATipoPersona(cliente.tipo_persona);
    console.log(`🔍 DEBUG: ¿Aplica a ${cliente.tipo_persona}? ${aplicaTipoPersona}`);
    console.log(`🔍 DEBUG: Campos del tipo: aplica_pf=${tipoDocumento.aplica_pf}, aplica_pfae=${tipoDocumento.aplica_pfae}, aplica_pm=${tipoDocumento.aplica_pm}`);
    
    if (!aplicaTipoPersona) {
      console.log(`❌ DEBUG: Tipo de documento no aplica a ${cliente.tipo_persona}`);
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
    
    console.log('✅ DEBUG: Documento creado exitosamente');
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

  // Subir documento usando el servicio
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
      const documento = await documentoService.subirDocumento({
        clienteId: parseInt(clienteId),
        documentoTipoId: parseInt(documentoTipoId),
        file,
        fechaDocumento: new Date(fechaDocumento),
        folioSolicitud,
        reemplazar: reemplazar === 'true',
      });

      res.status(201).json({
        success: true,
        message: 'Documento subido exitosamente',
        data: documento,
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
}
