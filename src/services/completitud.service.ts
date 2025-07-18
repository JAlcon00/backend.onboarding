import { Cliente } from '../modules/cliente/cliente.model';
import { Documento } from '../modules/documento/documento.model';
import { DocumentoTipo } from '../modules/documento/documentoTipo.model';
import { Solicitud } from '../modules/solicitud/solicitud.model';
import { Op } from 'sequelize';

export interface DocumentoRequerido {
  documento_tipo_id: number;
  nombre: string;
  opcional: boolean;
  vigencia_dias?: number;
  documentos_subidos: DocumentoSubido[];
  estado: 'completo' | 'vencido' | 'pendiente' | 'rechazado';
  dias_vencimiento?: number;
}

export interface DocumentoSubido {
  documento_id: number;
  archivo_url: string;
  fecha_documento: Date;
  fecha_expiracion?: Date;
  estatus: 'pendiente' | 'aceptado' | 'rechazado' | 'vencido';
  dias_vencimiento?: number;
  es_valido: boolean;
}

export interface CompletitudResult {
  cliente_id: number;
  tipo_persona: 'PF' | 'PF_AE' | 'PM';
  completitud_porcentaje: number;
  datos_basicos_completos: boolean;
  direccion_completa: boolean;
  documentos_completos: boolean;
  tiene_solicitudes: boolean;
  expediente_completo: boolean;
  documentos_requeridos: DocumentoRequerido[];
  resumen: {
    total_documentos_requeridos: number;
    documentos_completos: number;
    documentos_vencidos: number;
    documentos_pendientes: number;
    documentos_rechazados: number;
  };
  siguiente_accion: string;
  puede_proceder: boolean;
  mensaje_completitud: string;
}

export class CompletitudService {
  /**
   * Evalúa la completitud del expediente de un cliente
   */
  public static async evaluarCompletitud(clienteId: number): Promise<CompletitudResult> {
    // Obtener cliente con todas sus relaciones
    const cliente = await Cliente.findByPk(clienteId, {
      include: [
        {
          model: Documento,
          as: 'documentos',
          include: [
            {
              model: DocumentoTipo,
              as: 'tipo'
            }
          ]
        },
        {
          model: Solicitud,
          as: 'solicitudes'
        }
      ]
    });

    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Obtener todos los tipos de documento aplicables al tipo de persona
    const documentosTipoAplicables = await DocumentoTipo.findAll({
      where: this.getWhereClauseForTipoPersona(cliente.tipo_persona)
    });

    // Evaluar cada tipo de documento
    const documentosRequeridos: DocumentoRequerido[] = [];
    for (const tipoDoc of documentosTipoAplicables) {
      const documentosSubidos = cliente.documentos?.filter((doc: any) => 
        doc.documento_tipo_id === tipoDoc.documento_tipo_id
      ) || [];

      const documentoRequerido = await this.evaluarDocumentoTipo(tipoDoc, documentosSubidos);
      documentosRequeridos.push(documentoRequerido);
    }

    // Calcular completitud
    const completitud = this.calcularCompletitud(cliente, documentosRequeridos);

    return completitud;
  }

  /**
   * Evalúa si un cliente recurrente necesita actualizar documentos
   */
  public static async evaluarClienteRecurrente(rfc: string): Promise<{
    es_cliente_recurrente: boolean;
    documentos_vencidos: DocumentoRequerido[];
    puede_reutilizar_documentos: boolean;
    mensaje: string;
  }> {
    const cliente = await Cliente.findOne({
      where: { rfc: rfc.toUpperCase() },
      include: [
        {
          model: Documento,
          as: 'documentos',
          include: [
            {
              model: DocumentoTipo,
              as: 'tipo'
            }
          ]
        }
      ]
    });

    if (!cliente) {
      return {
        es_cliente_recurrente: false,
        documentos_vencidos: [],
        puede_reutilizar_documentos: false,
        mensaje: 'Cliente no encontrado en la base de datos'
      };
    }

    // Evaluar documentos del cliente recurrente
    const completitud = await this.evaluarCompletitud(cliente.cliente_id);
    const documentosVencidos = completitud.documentos_requeridos.filter(doc => 
      doc.estado === 'vencido' || doc.estado === 'rechazado'
    );

    const puedeReutilizar = documentosVencidos.length === 0;

    return {
      es_cliente_recurrente: true,
      documentos_vencidos: documentosVencidos,
      puede_reutilizar_documentos: puedeReutilizar,
      mensaje: puedeReutilizar 
        ? 'El cliente puede reutilizar sus documentos vigentes'
        : `El cliente debe actualizar ${documentosVencidos.length} documento(s) vencido(s) o rechazado(s)`
    };
  }

  /**
   * Obtiene cláusula WHERE para filtrar tipos de documento por tipo de persona
   */
  private static getWhereClauseForTipoPersona(tipoPersona: 'PF' | 'PF_AE' | 'PM'): any {
    switch (tipoPersona) {
      case 'PF':
        return { aplica_pf: true };
      case 'PF_AE':
        return { aplica_pfae: true };
      case 'PM':
        return { aplica_pm: true };
      default:
        throw new Error(`Tipo de persona no válido: ${tipoPersona}`);
    }
  }

  /**
   * Evalúa el estado de un tipo de documento específico
   */
  private static async evaluarDocumentoTipo(
    tipoDoc: DocumentoTipo, 
    documentosSubidos: Documento[]
  ): Promise<DocumentoRequerido> {
    const documentosValidados: DocumentoSubido[] = [];

    for (const documento of documentosSubidos) {
      // Actualizar estatus de vencimiento automáticamente
      await documento.actualizarEstatusVencimiento();

      const documentoSubido: DocumentoSubido = {
        documento_id: documento.documento_id,
        archivo_url: documento.archivo_url,
        fecha_documento: documento.fecha_documento,
        fecha_expiracion: documento.fecha_expiracion,
        estatus: documento.estatus,
        dias_vencimiento: documento.diasHastaVencimiento() || undefined,
        es_valido: documento.esValido()
      };

      documentosValidados.push(documentoSubido);
    }

    // Determinar estado general del tipo de documento
    const estado = this.determinarEstadoDocumento(tipoDoc, documentosValidados);
    const diasVencimiento = this.calcularDiasVencimientoMinimo(documentosValidados);

    return {
      documento_tipo_id: tipoDoc.documento_tipo_id,
      nombre: tipoDoc.nombre,
      opcional: tipoDoc.opcional,
      vigencia_dias: tipoDoc.vigencia_dias,
      documentos_subidos: documentosValidados,
      estado,
      dias_vencimiento: diasVencimiento
    };
  }

  /**
   * Determina el estado general de un tipo de documento
   */
  private static determinarEstadoDocumento(
    tipoDoc: DocumentoTipo, 
    documentos: DocumentoSubido[]
  ): 'completo' | 'vencido' | 'pendiente' | 'rechazado' {
    // Si es opcional y no hay documentos, se considera completo
    if (tipoDoc.opcional && documentos.length === 0) {
      return 'completo';
    }

    // Si no hay documentos y es requerido, está pendiente
    if (documentos.length === 0) {
      return 'pendiente';
    }

    // Verificar si hay algún documento válido
    const documentoValido = documentos.find(doc => doc.es_valido);
    if (documentoValido) {
      return 'completo';
    }

    // Verificar si hay documentos vencidos
    const documentoVencido = documentos.find(doc => doc.estatus === 'vencido');
    if (documentoVencido) {
      return 'vencido';
    }

    // Verificar si hay documentos rechazados
    const documentoRechazado = documentos.find(doc => doc.estatus === 'rechazado');
    if (documentoRechazado) {
      return 'rechazado';
    }

    // Si hay documentos pero están pendientes
    return 'pendiente';
  }

  /**
   * Calcula los días mínimos hasta el vencimiento
   */
  private static calcularDiasVencimientoMinimo(documentos: DocumentoSubido[]): number | undefined {
    const diasVencimiento = documentos
      .map(doc => doc.dias_vencimiento)
      .filter(dias => dias !== null && dias !== undefined) as number[];

    if (diasVencimiento.length === 0) {
      return undefined;
    }

    return Math.min(...diasVencimiento);
  }

  /**
   * Calcula la completitud general del cliente
   */
  private static calcularCompletitud(
    cliente: Cliente, 
    documentosRequeridos: DocumentoRequerido[]
  ): CompletitudResult {
    // Datos básicos del cliente
    const datosBasicosCompletos = cliente.isDatosBasicosCompletos();
    const direccionCompleta = cliente.isDireccionCompleta();
    const tieneSolicitudes = (cliente as any).solicitudes && (cliente as any).solicitudes.length > 0;

    // Análisis de documentos
    const documentosObligatorios = documentosRequeridos.filter(doc => !doc.opcional);
    const documentosCompletos = documentosRequeridos.filter(doc => doc.estado === 'completo');
    const documentosVencidos = documentosRequeridos.filter(doc => doc.estado === 'vencido');
    const documentosPendientes = documentosRequeridos.filter(doc => doc.estado === 'pendiente');
    const documentosRechazados = documentosRequeridos.filter(doc => doc.estado === 'rechazado');

    // Calcular completitud de documentos obligatorios
    const documentosObligatoriosCompletos = documentosObligatorios.filter(doc => doc.estado === 'completo');
    const documentosCompletos_bool = documentosObligatorios.length === 0 || 
                                    documentosObligatoriosCompletos.length === documentosObligatorios.length;

    // Calcular porcentaje de completitud
    let porcentaje = 0;
    
    // Datos básicos (40%)
    if (datosBasicosCompletos) porcentaje += 40;
    
    // Dirección (20%)
    if (direccionCompleta) porcentaje += 20;
    
    // Documentos obligatorios (40%)
    if (documentosObligatorios.length > 0) {
      const porcentajeDocumentos = (documentosObligatoriosCompletos.length / documentosObligatorios.length) * 40;
      porcentaje += porcentajeDocumentos;
    } else {
      porcentaje += 40; // Si no hay documentos obligatorios
    }

    // Determinar expediente completo
    const expedienteCompleto = datosBasicosCompletos && direccionCompleta && documentosCompletos_bool;

    // Determinar siguiente acción
    const siguienteAccion = this.determinarSiguienteAccion(
      datosBasicosCompletos,
      direccionCompleta,
      documentosCompletos_bool,
      documentosVencidos.length,
      documentosPendientes.length,
      documentosRechazados.length
    );

    // Puede proceder si tiene al menos 80% de completitud
    const puedeProceder = porcentaje >= 80 && documentosVencidos.length === 0 && documentosRechazados.length === 0;

    // Mensaje de completitud
    const mensajeCompletitud = this.generarMensajeCompletitud(
      porcentaje,
      documentosVencidos.length,
      documentosPendientes.length,
      documentosRechazados.length
    );

    return {
      cliente_id: cliente.cliente_id,
      tipo_persona: cliente.tipo_persona,
      completitud_porcentaje: Math.round(porcentaje),
      datos_basicos_completos: datosBasicosCompletos,
      direccion_completa: direccionCompleta,
      documentos_completos: documentosCompletos_bool,
      tiene_solicitudes: tieneSolicitudes,
      expediente_completo: expedienteCompleto,
      documentos_requeridos: documentosRequeridos,
      resumen: {
        total_documentos_requeridos: documentosRequeridos.length,
        documentos_completos: documentosCompletos.length,
        documentos_vencidos: documentosVencidos.length,
        documentos_pendientes: documentosPendientes.length,
        documentos_rechazados: documentosRechazados.length
      },
      siguiente_accion: siguienteAccion,
      puede_proceder: puedeProceder,
      mensaje_completitud: mensajeCompletitud
    };
  }

  /**
   * Determina la siguiente acción recomendada
   */
  private static determinarSiguienteAccion(
    datosBasicos: boolean,
    direccion: boolean,
    documentos: boolean,
    vencidos: number,
    pendientes: number,
    rechazados: number
  ): string {
    if (!datosBasicos) {
      return 'Completar datos básicos del cliente';
    }

    if (!direccion) {
      return 'Completar información de dirección';
    }

    if (rechazados > 0) {
      return `Revisar y resubir ${rechazados} documento(s) rechazado(s)`;
    }

    if (vencidos > 0) {
      return `Actualizar ${vencidos} documento(s) vencido(s)`;
    }

    if (pendientes > 0) {
      return `Subir ${pendientes} documento(s) pendiente(s)`;
    }

    if (!documentos) {
      return 'Completar documentación requerida';
    }

    return 'Expediente completo - Listo para revisión';
  }

  /**
   * Genera mensaje descriptivo de completitud
   */
  private static generarMensajeCompletitud(
    porcentaje: number,
    vencidos: number,
    pendientes: number,
    rechazados: number
  ): string {
    if (porcentaje === 100) {
      return 'Expediente completo y listo para procesamiento';
    }

    if (porcentaje >= 80) {
      if (vencidos > 0) {
        return `Expediente casi completo, pero hay ${vencidos} documento(s) vencido(s) que requieren actualización`;
      }
      if (rechazados > 0) {
        return `Expediente casi completo, pero hay ${rechazados} documento(s) rechazado(s) que requieren corrección`;
      }
      return 'Expediente casi completo, faltan algunos documentos menores';
    }

    if (porcentaje >= 60) {
      return 'Expediente parcialmente completo, faltan documentos importantes';
    }

    if (porcentaje >= 40) {
      return 'Expediente en proceso, faltan datos básicos y documentos';
    }

    return 'Expediente en etapa inicial, se requiere información básica';
  }
}
