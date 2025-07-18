import { Documento } from '../modules/documento/documento.model';
import { DocumentoTipo } from '../modules/documento/documentoTipo.model';
import { Cliente } from '../modules/cliente/cliente.model';
import { storageService } from './storage.service';
import { setupAssociations } from '../models/associations';
import { Op } from 'sequelize';

// Inicializar asociaciones
setupAssociations();

interface SubirDocumentoOptions {
  clienteId: number;
  documentoTipoId: number;
  file: Express.Multer.File;
  fechaDocumento: Date;
  folioSolicitud?: string;
  reemplazar?: boolean;
}

interface ValidacionCompletitud {
  completo: boolean;
  documentosFaltantes: any[];
  documentosSubidos: any[];
  porcentajeCompletitud: number;
}

export class DocumentoService {
  
  /**
   * Sube un documento y calcula automáticamente su vigencia
   */
  async subirDocumento(options: SubirDocumentoOptions): Promise<Documento> {
    const { clienteId, documentoTipoId, file, fechaDocumento, folioSolicitud, reemplazar = false } = options;

    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Verificar que el tipo de documento existe
    const tipoDocumento = await DocumentoTipo.findByPk(documentoTipoId);
    if (!tipoDocumento) {
      throw new Error('Tipo de documento no encontrado');
    }

    // Verificar que el tipo de documento aplica al tipo de persona
    if (!tipoDocumento.aplicaATipoPersona(cliente.tipo_persona)) {
      throw new Error(`El documento '${tipoDocumento.nombre}' no aplica para ${cliente.tipo_persona}`);
    }

    // Validar vigencia del documento al momento de subida
    await this.validarVigenciaDocumento(tipoDocumento, fechaDocumento);

    // Calcular fecha de expiración
    const fechaExpiracion = tipoDocumento.calcularFechaExpiracion(fechaDocumento);

    // Generar nombre completo del cliente
    const nombreCliente = cliente.getNombreCompleto();

    // Si es reemplazo, buscar y eliminar documento anterior
    if (reemplazar) {
      await this.eliminarDocumentoAnterior(clienteId, documentoTipoId);
    }

    // Subir archivo a Google Cloud Storage
    const uploadResult = await storageService.uploadDocumento(file, {
      clienteId,
      clienteNombre: nombreCliente,
      folioSolicitud,
      tipoDocumento: tipoDocumento.nombre,
      reemplazar,
    });

    // Crear registro en la base de datos
    const documento = await Documento.create({
      cliente_id: clienteId,
      documento_tipo_id: documentoTipoId,
      archivo_url: uploadResult.url,
      fecha_documento: fechaDocumento,
      fecha_expiracion: fechaExpiracion || undefined,
      estatus: 'pendiente',
    });

    return documento;
  }

  /**
   * Valida que un documento esté vigente al momento de subida
   */
  private async validarVigenciaDocumento(tipoDocumento: DocumentoTipo, fechaDocumento: Date): Promise<void> {
    const fechaActual = new Date();
    
    // Si el documento tiene vigencia definida
    if (tipoDocumento.vigencia_dias) {
      const fechaExpiracion = tipoDocumento.calcularFechaExpiracion(fechaDocumento);
      
      if (fechaExpiracion && fechaExpiracion < fechaActual) {
        throw new Error(
          `El documento '${tipoDocumento.nombre}' ya está vencido. ` +
          `Vigencia: ${tipoDocumento.getDescripcionVigencia()}. ` +
          `Fecha de expiración: ${fechaExpiracion.toLocaleDateString()}`
        );
      }
    }

    // Validar que la fecha del documento no sea futura
    if (fechaDocumento > fechaActual) {
      throw new Error('La fecha del documento no puede ser futura');
    }

    // Validar que la fecha del documento no sea muy antigua (más de 5 años)
    const fechaMinima = new Date();
    fechaMinima.setFullYear(fechaMinima.getFullYear() - 5);
    
    if (fechaDocumento < fechaMinima) {
      throw new Error('La fecha del documento es muy antigua (más de 5 años)');
    }
  }

  /**
   * Elimina un documento anterior del mismo tipo
   */
  private async eliminarDocumentoAnterior(clienteId: number, documentoTipoId: number): Promise<void> {
    const documentoAnterior = await Documento.findOne({
      where: {
        cliente_id: clienteId,
        documento_tipo_id: documentoTipoId,
      },
    });

    if (documentoAnterior) {
      // Eliminar archivo de storage (opcional, depende de la estrategia)
      // await storageService.eliminarArchivo(documentoAnterior.archivo_url);
      
      // Eliminar registro de BD
      await documentoAnterior.destroy();
    }
  }

  /**
   * Obtiene documentos faltantes para un cliente según su tipo de persona
   */
  async getDocumentosFaltantes(clienteId: number, folioSolicitud?: string): Promise<any[]> {
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Obtener tipos de documento aplicables según el tipo de persona
    const tiposAplicables = await DocumentoTipo.findAll({
      where: {
        [Op.or]: [
          { aplica_pf: cliente.tipo_persona === 'PF' },
          { aplica_pfae: cliente.tipo_persona === 'PF_AE' },
          { aplica_pm: cliente.tipo_persona === 'PM' },
        ],
      },
    });

    // Obtener documentos ya subidos
    const documentosSubidos = await Documento.findAll({
      where: { cliente_id: clienteId },
      include: [{ model: DocumentoTipo, as: 'tipo' }],
    });

    // Filtrar documentos válidos (no vencidos y estado correcto)
    const documentosValidos = documentosSubidos.filter(doc => {
      const tipo = (doc as any).tipo as DocumentoTipo;
      
      // Si es documento que se renueva por solicitud y no tenemos folio, no es válido
      if (tipo.necesitaRenovacionPorSolicitud() && !folioSolicitud) {
        return false;
      }
      
      // Verificar que el documento no esté vencido
      return doc.esValido();
    });

    const tiposSubidos = documentosValidos.map(doc => doc.documento_tipo_id);

    // Filtrar tipos faltantes
    const tiposFaltantes = tiposAplicables.filter(tipo => {
      if (tiposSubidos.includes(tipo.documento_tipo_id)) {
        return false;
      }
      
      // Si es opcional, no es faltante obligatorio
      if (tipo.opcional) {
        return false;
      }
      
      return true;
    });

    return tiposFaltantes.map(tipo => ({
      documento_tipo_id: tipo.documento_tipo_id,
      nombre: tipo.nombre,
      descripcion_vigencia: tipo.getDescripcionVigencia(),
      opcional: tipo.opcional,
      necesita_renovacion_por_solicitud: tipo.necesitaRenovacionPorSolicitud(),
    }));
  }

  /**
   * Verifica la completitud de documentos para un cliente
   */
  async verificarCompletitud(clienteId: number, folioSolicitud?: string): Promise<ValidacionCompletitud> {
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    const documentosFaltantes = await this.getDocumentosFaltantes(clienteId, folioSolicitud);
    
    // Obtener documentos subidos válidos
    const documentosSubidos = await Documento.findAll({
      where: { 
        cliente_id: clienteId,
        estatus: {
          [Op.in]: ['pendiente', 'aceptado']
        }
      },
      include: [{ model: DocumentoTipo, as: 'tipo' }],
    });

    // Filtrar solo documentos válidos
    const documentosValidos = documentosSubidos.filter(doc => {
      const tipo = (doc as any).tipo as DocumentoTipo;
      
      // Si requiere renovación por solicitud, verificar folio
      if (tipo.necesitaRenovacionPorSolicitud() && !folioSolicitud) {
        return false;
      }
      
      return doc.esValido();
    });

    // Obtener total de documentos obligatorios
    const totalObligatorios = await DocumentoTipo.count({
      where: {
        [Op.or]: [
          { aplica_pf: cliente.tipo_persona === 'PF' },
          { aplica_pfae: cliente.tipo_persona === 'PF_AE' },
          { aplica_pm: cliente.tipo_persona === 'PM' },
        ],
        opcional: false,
      },
    });

    const documentosCompletados = totalObligatorios - documentosFaltantes.length;
    const porcentajeCompletitud = Math.round((documentosCompletados / totalObligatorios) * 100);

    return {
      completo: documentosFaltantes.length === 0,
      documentosFaltantes,
      documentosSubidos: documentosValidos,
      porcentajeCompletitud,
    };
  }

  /**
   * Actualiza el estatus de un documento (revisión manual)
   */
  async actualizarEstatusDocumento(
    documentoId: number, 
    nuevoEstatus: 'aceptado' | 'rechazado', 
    comentario?: string
  ): Promise<Documento> {
    const documento = await Documento.findByPk(documentoId);
    if (!documento) {
      throw new Error('Documento no encontrado');
    }

    documento.estatus = nuevoEstatus;
    if (comentario) {
      documento.comentario_revisor = comentario;
    }

    await documento.save();
    return documento;
  }

  /**
   * Regenera URL firmada para un documento
   */
  async regenerarUrlDocumento(documentoId: number): Promise<string> {
    const documento = await Documento.findByPk(documentoId);
    if (!documento) {
      throw new Error('Documento no encontrado');
    }

    // Extraer ruta del archivo desde la URL actual
    const url = new URL(documento.archivo_url);
    const rutaArchivo = url.pathname.substring(1); // Remover el primer "/"

    // Generar nueva URL firmada
    const nuevaUrl = await storageService.regenerarUrlFirmada(rutaArchivo);
    
    // Actualizar en la base de datos
    documento.archivo_url = nuevaUrl;
    await documento.save();

    return nuevaUrl;
  }

  /**
   * Busca cliente por RFC o folio de solicitud
   */
  async buscarClientePorRFCOFolio(identificador: string): Promise<Cliente | null> {
    // Intentar buscar por RFC primero
    let cliente = await Cliente.findOne({
      where: { rfc: identificador.toUpperCase() }
    });

    if (!cliente) {
      // Si no se encuentra por RFC, buscar por folio en solicitudes
      // (Aquí asumo que tienes un modelo Solicitud)
      // cliente = await this.buscarPorFolio(identificador);
    }

    return cliente;
  }

  /**
   * Actualiza automáticamente el estatus de documentos vencidos
   */
  async actualizarDocumentosVencidos(): Promise<number> {
    const documentosVencidos = await Documento.findAll({
      where: {
        fecha_expiracion: {
          [Op.lt]: new Date(),
        },
        estatus: {
          [Op.not]: 'vencido',
        },
      },
    });

    let actualizados = 0;
    for (const documento of documentosVencidos) {
      documento.estatus = 'vencido';
      await documento.save();
      actualizados++;
    }

    return actualizados;
  }

  /**
   * Obtiene documentos próximos a vencer (próximos 30 días)
   */
  async getDocumentosProximosAVencer(diasAnticipacion: number = 30): Promise<Documento[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    return await Documento.findAll({
      where: {
        fecha_expiracion: {
          [Op.between]: [new Date(), fechaLimite],
        },
        estatus: 'aceptado',
      },
      include: [
        { model: Cliente, as: 'cliente' },
        { model: DocumentoTipo, as: 'tipo' },
      ],
    });
  }

  /**
   * Obtiene documentos por cliente
   */
  async getDocumentosByCliente(clienteId: number): Promise<Documento[]> {
    const documentos = await Documento.findAll({
      where: { cliente_id: clienteId },
      include: [{ model: Cliente, as: 'clienteDocumento' }, { model: DocumentoTipo, as: 'tipo' }]
    });
    return documentos;
  }

  /**
   * Obtiene un documento por su ID, incluyendo el cliente y el tipo
   */
  async getDocumentoById(documentoId: number): Promise<Documento | null> {
    const documento = await Documento.findByPk(documentoId, {
      include: [{ model: Cliente, as: 'clienteDocumento' }, { model: DocumentoTipo, as: 'tipo' }]
    });
    return documento;
  }

  /**
   * Busca documentos según criterios
   */
  async buscarDocumentos(criterios: any): Promise<Documento[]> {
    const whereClause: any = {};
    if (criterios.cliente_id) whereClause.cliente_id = criterios.cliente_id;
    if (criterios.documento_tipo_id) whereClause.documento_tipo_id = criterios.documento_tipo_id;
    if (criterios.estatus) whereClause.estatus = criterios.estatus;

    const documentos = await Documento.findAll({
      where: whereClause,
      include: [
        { model: Cliente, as: 'clienteDocumento' },
        { model: DocumentoTipo, as: 'tipo' }
      ]
    });

    return documentos;
  }
}

export const documentoService = new DocumentoService();
