import { geminiService } from './gemini.service';
import Document from '../modules/documento/documento.model';
import Cliente from '../modules/cliente/cliente.model';
import { DocumentoTipo } from '../modules/documento/documentoTipo.model';
import { TIPOS_DOCUMENTO_MEXICANO, DocumentAnalysisResponse } from '../config/gemini';
import { logInfo, logError } from '../config/logger';

export interface CoherenciaAnalysis {
  esCoherente: boolean;
  puntuacionCoherencia: number; // 0-100
  tipoPersona: 'PF' | 'PF_AE' | 'PM';
  validacionesPorDocumento: DocumentValidation[];
  discrepanciasGenerales: Discrepancia[];
  recomendaciones: string[];
  alertasRiesgo: AlertaRiesgo[];
}

export interface DocumentValidation {
  documentoId: number;
  tipoDocumento: string;
  esValido: boolean;
  datosExtraidos: any;
  coherenciaConCliente: {
    campos_coinciden: string[];
    campos_discrepantes: string[];
    discrepancias: Discrepancia[];
  };
}

export interface Discrepancia {
  campo: string;
  valorCliente: any;
  valorDocumento: any;
  criticidad: 'alta' | 'media' | 'baja';
  impacto: string;
  requiereRevision: boolean;
}

export interface AlertaRiesgo {
  tipo: 'inconsistencia_datos' | 'documento_invalido' | 'informacion_faltante' | 'posible_fraude';
  descripcion: string;
  criticidad: 'alta' | 'media' | 'baja';
  accionRecomendada: string;
}

class CoherenciaService {
  
  /**
   * Analiza la coherencia entre datos del cliente y documentos subidos
   */
  async analizarCoherencia(clienteId: number): Promise<CoherenciaAnalysis> {
    try {
      logInfo('Iniciando análisis de coherencia', { clienteId });

      // Obtener cliente con sus documentos
      const cliente = await Cliente.findByPk(clienteId, {
        include: [
          {
            model: Document,
            as: 'documentos',
            include: [
              {
                model: DocumentoTipo,
                as: 'tipo'
              }
            ],
            where: { estatus: 'aceptado' }
          }
        ]
      });

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const validacionesPorDocumento: DocumentValidation[] = [];
      const discrepanciasGenerales: Discrepancia[] = [];
      const alertasRiesgo: AlertaRiesgo[] = [];

      // Analizar cada documento
      for (const documento of cliente.documentos || []) {
        const validacion = await this.validarDocumentoConCliente(cliente, documento);
        validacionesPorDocumento.push(validacion);

        // Acumular discrepancias
        discrepanciasGenerales.push(...validacion.coherenciaConCliente.discrepancias);
      }

      // Análisis específico por tipo de persona
      const analisisEspecifico = await this.analizarPorTipoPersona(cliente, validacionesPorDocumento);

      // Calcular puntuación de coherencia
      const puntuacionCoherencia = this.calcularPuntuacionCoherencia(validacionesPorDocumento, discrepanciasGenerales);

      // Generar alertas de riesgo
      const alertas = this.generarAlertasRiesgo(discrepanciasGenerales, validacionesPorDocumento);
      alertasRiesgo.push(...alertas, ...analisisEspecifico.alertas);

      // Generar recomendaciones
      const recomendaciones = this.generarRecomendaciones(cliente.tipo_persona, discrepanciasGenerales, alertasRiesgo);

      const resultado: CoherenciaAnalysis = {
        esCoherente: puntuacionCoherencia >= 80 && alertasRiesgo.filter(a => a.criticidad === 'alta').length === 0,
        puntuacionCoherencia,
        tipoPersona: cliente.tipo_persona,
        validacionesPorDocumento,
        discrepanciasGenerales,
        recomendaciones,
        alertasRiesgo
      };

      logInfo('Análisis de coherencia completado', { 
        clienteId, 
        puntuacion: puntuacionCoherencia,
        esCoherente: resultado.esCoherente 
      });

      return resultado;

    } catch (error: any) {
      logError(`Error en análisis de coherencia: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida un documento específico contra los datos del cliente
   */
  private async validarDocumentoConCliente(cliente: any, documento: any): Promise<DocumentValidation> {
    try {
      // Obtener análisis del documento con Gemini
      const analysisResult: DocumentAnalysisResponse = await geminiService.analyzeDocument(documento.documento_id.toString());

      const campos_coinciden: string[] = [];
      const campos_discrepantes: string[] = [];
      const discrepancias: Discrepancia[] = [];

      // Validaciones específicas por tipo de documento
      switch (documento.tipo.nombre.toLowerCase()) {
        case 'ine':
        case 'credencial de elector':
          this.validarINE(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
        
        case 'rfc':
        case 'constancia de situación fiscal':
          this.validarRFC(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
        
        case 'curp':
          this.validarCURP(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
        
        case 'comprobante de domicilio':
          this.validarComprobanteDomicilio(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
        
        case 'acta constitutiva':
          this.validarActaConstitutiva(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
        
        case 'comprobante de ingresos':
          this.validarComprobanteIngresos(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
        
        case 'estado de cuenta':
          this.validarEstadoCuenta(cliente, analysisResult.datosExtraidos, campos_coinciden, campos_discrepantes, discrepancias);
          break;
      }

      return {
        documentoId: documento.documento_id,
        tipoDocumento: documento.tipo.nombre,
        esValido: analysisResult.esValido,
        datosExtraidos: analysisResult.datosExtraidos,
        coherenciaConCliente: {
          campos_coinciden,
          campos_discrepantes,
          discrepancias
        }
      };

    } catch (error: any) {
      logError(`Error validando documento: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validaciones específicas para INE/Credencial de Elector
   */
  private validarINE(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    // Validar nombre completo
    if (datosDocumento.nombre_completo) {
      const nombreCliente = `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`.trim();
      if (this.normalizarTexto(nombreCliente) === this.normalizarTexto(datosDocumento.nombre_completo)) {
        coinciden.push('nombre_completo');
      } else {
        discrepantes.push('nombre_completo');
        discrepancias.push({
          campo: 'nombre_completo',
          valorCliente: nombreCliente,
          valorDocumento: datosDocumento.nombre_completo,
          criticidad: 'alta',
          impacto: 'El nombre en la credencial no coincide con el registrado',
          requiereRevision: true
        });
      }
    }

    // Validar CURP
    if (datosDocumento.curp && cliente.curp) {
      if (cliente.curp === datosDocumento.curp) {
        coinciden.push('curp');
      } else {
        discrepantes.push('curp');
        discrepancias.push({
          campo: 'curp',
          valorCliente: cliente.curp,
          valorDocumento: datosDocumento.curp,
          criticidad: 'alta',
          impacto: 'CURP no coincide con la credencial de elector',
          requiereRevision: true
        });
      }
    }

    // Validar dirección
    if (datosDocumento.direccion) {
      const direccionCliente = `${cliente.calle || ''} ${cliente.numero_exterior || ''} ${cliente.colonia || ''} ${cliente.ciudad || ''} ${cliente.estado || ''}`.trim();
      if (this.compararDirecciones(direccionCliente, datosDocumento.direccion)) {
        coinciden.push('direccion');
      } else {
        discrepantes.push('direccion');
        discrepancias.push({
          campo: 'direccion',
          valorCliente: direccionCliente,
          valorDocumento: datosDocumento.direccion,
          criticidad: 'media',
          impacto: 'La dirección puede haber cambiado desde la emisión de la credencial',
          requiereRevision: false
        });
      }
    }
  }

  /**
   * Validaciones específicas para RFC/Constancia de Situación Fiscal
   */
  private validarRFC(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    // Validar RFC
    if (datosDocumento.rfc && cliente.rfc) {
      if (cliente.rfc === datosDocumento.rfc) {
        coinciden.push('rfc');
      } else {
        discrepantes.push('rfc');
        discrepancias.push({
          campo: 'rfc',
          valorCliente: cliente.rfc,
          valorDocumento: datosDocumento.rfc,
          criticidad: 'alta',
          impacto: 'RFC no coincide con la constancia fiscal',
          requiereRevision: true
        });
      }
    }

    // Validar razón social / nombre (para PM)
    if (cliente.tipo_persona === 'PM' && datosDocumento.razon_social) {
      if (this.normalizarTexto(cliente.razon_social) === this.normalizarTexto(datosDocumento.razon_social)) {
        coinciden.push('razon_social');
      } else {
        discrepantes.push('razon_social');
        discrepancias.push({
          campo: 'razon_social',
          valorCliente: cliente.razon_social,
          valorDocumento: datosDocumento.razon_social,
          criticidad: 'alta',
          impacto: 'Razón social no coincide con la constancia fiscal',
          requiereRevision: true
        });
      }
    }

    // Validar régimen fiscal
    if (datosDocumento.regimen_fiscal && cliente.regimen_fiscal) {
      if (cliente.regimen_fiscal === datosDocumento.regimen_fiscal) {
        coinciden.push('regimen_fiscal');
      } else {
        discrepantes.push('regimen_fiscal');
        discrepancias.push({
          campo: 'regimen_fiscal',
          valorCliente: cliente.regimen_fiscal,
          valorDocumento: datosDocumento.regimen_fiscal,
          criticidad: 'media',
          impacto: 'Régimen fiscal diferente al registrado',
          requiereRevision: true
        });
      }
    }
  }

  /**
   * Validaciones específicas para CURP
   */
  private validarCURP(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    if (datosDocumento.curp && cliente.curp) {
      if (cliente.curp === datosDocumento.curp) {
        coinciden.push('curp');
      } else {
        discrepantes.push('curp');
        discrepancias.push({
          campo: 'curp',
          valorCliente: cliente.curp,
          valorDocumento: datosDocumento.curp,
          criticidad: 'alta',
          impacto: 'CURP no coincide',
          requiereRevision: true
        });
      }
    }

    // Validar fecha de nacimiento derivada del CURP
    if (datosDocumento.fecha_nacimiento && cliente.fecha_nacimiento) {
      const fechaCliente = new Date(cliente.fecha_nacimiento).toISOString().split('T')[0];
      const fechaDocumento = new Date(datosDocumento.fecha_nacimiento).toISOString().split('T')[0];
      
      if (fechaCliente === fechaDocumento) {
        coinciden.push('fecha_nacimiento');
      } else {
        discrepantes.push('fecha_nacimiento');
        discrepancias.push({
          campo: 'fecha_nacimiento',
          valorCliente: fechaCliente,
          valorDocumento: fechaDocumento,
          criticidad: 'alta',
          impacto: 'Fecha de nacimiento no coincide con CURP',
          requiereRevision: true
        });
      }
    }
  }

  /**
   * Validaciones para comprobante de domicilio
   */
  private validarComprobanteDomicilio(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    // Validar titular del servicio
    if (datosDocumento.titular) {
      const nombreCliente = `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`.trim();
      if (this.normalizarTexto(nombreCliente) === this.normalizarTexto(datosDocumento.titular)) {
        coinciden.push('titular');
      } else {
        // Puede ser válido si es familiar directo
        discrepantes.push('titular');
        discrepancias.push({
          campo: 'titular',
          valorCliente: nombreCliente,
          valorDocumento: datosDocumento.titular,
          criticidad: 'media',
          impacto: 'El comprobante no está a nombre del cliente (puede ser familiar)',
          requiereRevision: true
        });
      }
    }

    // Validar dirección
    if (datosDocumento.direccion) {
      const direccionCliente = `${cliente.calle || ''} ${cliente.numero_exterior || ''} ${cliente.colonia || ''} ${cliente.ciudad || ''} ${cliente.estado || ''}`.trim();
      if (this.compararDirecciones(direccionCliente, datosDocumento.direccion)) {
        coinciden.push('direccion');
      } else {
        discrepantes.push('direccion');
        discrepancias.push({
          campo: 'direccion',
          valorCliente: direccionCliente,
          valorDocumento: datosDocumento.direccion,
          criticidad: 'alta',
          impacto: 'Dirección del comprobante no coincide con la registrada',
          requiereRevision: true
        });
      }
    }
  }

  /**
   * Validaciones para Acta Constitutiva (PM)
   */
  private validarActaConstitutiva(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    if (cliente.tipo_persona !== 'PM') {
      discrepancias.push({
        campo: 'tipo_persona',
        valorCliente: cliente.tipo_persona,
        valorDocumento: 'PM',
        criticidad: 'alta',
        impacto: 'Acta constitutiva solo aplica para Personas Morales',
        requiereRevision: true
      });
      return;
    }

    // Validar razón social
    if (datosDocumento.razon_social && cliente.razon_social) {
      if (this.normalizarTexto(cliente.razon_social) === this.normalizarTexto(datosDocumento.razon_social)) {
        coinciden.push('razon_social');
      } else {
        discrepantes.push('razon_social');
        discrepancias.push({
          campo: 'razon_social',
          valorCliente: cliente.razon_social,
          valorDocumento: datosDocumento.razon_social,
          criticidad: 'alta',
          impacto: 'Razón social no coincide con el acta constitutiva',
          requiereRevision: true
        });
      }
    }

    // Validar representante legal
    if (datosDocumento.representante_legal && cliente.representante_legal) {
      if (this.normalizarTexto(cliente.representante_legal) === this.normalizarTexto(datosDocumento.representante_legal)) {
        coinciden.push('representante_legal');
      } else {
        discrepantes.push('representante_legal');
        discrepancias.push({
          campo: 'representante_legal',
          valorCliente: cliente.representante_legal,
          valorDocumento: datosDocumento.representante_legal,
          criticidad: 'media',
          impacto: 'Representante legal diferente (puede haber cambio de poderes)',
          requiereRevision: true
        });
      }
    }
  }

  /**
   * Validaciones para comprobantes de ingresos
   */
  private validarComprobanteIngresos(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    // Validar nombre/razón social
    const nombreCliente = cliente.tipo_persona === 'PM' 
      ? cliente.razon_social 
      : `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`.trim();

    if (datosDocumento.titular && this.normalizarTexto(nombreCliente) === this.normalizarTexto(datosDocumento.titular)) {
      coinciden.push('titular');
    } else if (datosDocumento.titular) {
      discrepantes.push('titular');
      discrepancias.push({
        campo: 'titular',
        valorCliente: nombreCliente,
        valorDocumento: datosDocumento.titular,
        criticidad: 'alta',
        impacto: 'El comprobante de ingresos no corresponde al cliente',
        requiereRevision: true
      });
    }

    // Validar RFC
    if (datosDocumento.rfc && cliente.rfc) {
      if (cliente.rfc === datosDocumento.rfc) {
        coinciden.push('rfc');
      } else {
        discrepantes.push('rfc');
        discrepancias.push({
          campo: 'rfc',
          valorCliente: cliente.rfc,
          valorDocumento: datosDocumento.rfc,
          criticidad: 'alta',
          impacto: 'RFC no coincide en comprobante de ingresos',
          requiereRevision: true
        });
      }
    }
  }

  /**
   * Validaciones para estado de cuenta
   */
  private validarEstadoCuenta(cliente: any, datosDocumento: any, coinciden: string[], discrepantes: string[], discrepancias: Discrepancia[]) {
    // Similar a comprobante de ingresos pero con validaciones específicas de bancos
    const nombreCliente = cliente.tipo_persona === 'PM' 
      ? cliente.razon_social 
      : `${cliente.nombre} ${cliente.apellido_paterno} ${cliente.apellido_materno || ''}`.trim();

    if (datosDocumento.titular && this.normalizarTexto(nombreCliente) === this.normalizarTexto(datosDocumento.titular)) {
      coinciden.push('titular');
    } else if (datosDocumento.titular) {
      discrepantes.push('titular');
      discrepancias.push({
        campo: 'titular',
        valorCliente: nombreCliente,
        valorDocumento: datosDocumento.titular,
        criticidad: 'alta',
        impacto: 'El estado de cuenta no corresponde al cliente',
        requiereRevision: true
      });
    }
  }

  /**
   * Análisis específico por tipo de persona
   */
  private async analizarPorTipoPersona(cliente: any, validaciones: DocumentValidation[]): Promise<{alertas: AlertaRiesgo[]}> {
    const alertas: AlertaRiesgo[] = [];

    switch (cliente.tipo_persona) {
      case 'PF':
        // Persona Física: verificar documentos básicos
        this.validarDocumentosPF(validaciones, alertas);
        break;
      
      case 'PF_AE':
        // Persona Física con Actividad Empresarial
        this.validarDocumentosPFAE(validaciones, alertas);
        break;
      
      case 'PM':
        // Persona Moral
        this.validarDocumentosPM(validaciones, alertas);
        break;
    }

    return { alertas };
  }

  private validarDocumentosPF(validaciones: DocumentValidation[], alertas: AlertaRiesgo[]) {
    const tiposRequeridos = ['ine', 'rfc', 'comprobante de domicilio'];
    const tiposPresentes = validaciones.map(v => v.tipoDocumento.toLowerCase());

    for (const tipoRequerido of tiposRequeridos) {
      if (!tiposPresentes.some(t => t.includes(tipoRequerido))) {
        alertas.push({
          tipo: 'informacion_faltante',
          descripcion: `Falta documento: ${tipoRequerido}`,
          criticidad: 'alta',
          accionRecomendada: `Solicitar ${tipoRequerido} al cliente`
        });
      }
    }
  }

  private validarDocumentosPFAE(validaciones: DocumentValidation[], alertas: AlertaRiesgo[]) {
    this.validarDocumentosPF(validaciones, alertas);
    
    // Documentos adicionales para PF con AE
    const tiposAdicionales = ['comprobante de ingresos'];
    const tiposPresentes = validaciones.map(v => v.tipoDocumento.toLowerCase());

    for (const tipoAdicional of tiposAdicionales) {
      if (!tiposPresentes.some(t => t.includes(tipoAdicional))) {
        alertas.push({
          tipo: 'informacion_faltante',
          descripcion: `Para PF con AE se requiere: ${tipoAdicional}`,
          criticidad: 'media',
          accionRecomendada: `Solicitar ${tipoAdicional} para completar perfil empresarial`
        });
      }
    }
  }

  private validarDocumentosPM(validaciones: DocumentValidation[], alertas: AlertaRiesgo[]) {
    const tiposRequeridos = ['acta constitutiva', 'rfc', 'comprobante de domicilio'];
    const tiposPresentes = validaciones.map(v => v.tipoDocumento.toLowerCase());

    for (const tipoRequerido of tiposRequeridos) {
      if (!tiposPresentes.some(t => t.includes(tipoRequerido))) {
        alertas.push({
          tipo: 'informacion_faltante',
          descripcion: `Documento requerido para PM: ${tipoRequerido}`,
          criticidad: 'alta',
          accionRecomendada: `Solicitar ${tipoRequerido} para Persona Moral`
        });
      }
    }
  }

  /**
   * Calcula la puntuación de coherencia basada en las validaciones
   */
  private calcularPuntuacionCoherencia(validaciones: DocumentValidation[], discrepancias: Discrepancia[]): number {
    if (validaciones.length === 0) return 0;

    const totalCampos = validaciones.reduce((acc, v) => 
      acc + v.coherenciaConCliente.campos_coinciden.length + v.coherenciaConCliente.campos_discrepantes.length, 0);

    const camposCoincidentes = validaciones.reduce((acc, v) => 
      acc + v.coherenciaConCliente.campos_coinciden.length, 0);

    const penalizacionAlta = discrepancias.filter(d => d.criticidad === 'alta').length * 20;
    const penalizacionMedia = discrepancias.filter(d => d.criticidad === 'media').length * 10;
    const penalizacionBaja = discrepancias.filter(d => d.criticidad === 'baja').length * 5;

    const puntuacionBase = totalCampos > 0 ? (camposCoincidentes / totalCampos) * 100 : 0;
    const puntuacionFinal = Math.max(0, puntuacionBase - penalizacionAlta - penalizacionMedia - penalizacionBaja);

    return Math.round(puntuacionFinal);
  }

  /**
   * Genera alertas de riesgo basadas en las discrepancias
   */
  private generarAlertasRiesgo(discrepancias: Discrepancia[], validaciones: DocumentValidation[]): AlertaRiesgo[] {
    const alertas: AlertaRiesgo[] = [];

    // Alertas por discrepancias de alta criticidad
    const discrepanciasAltas = discrepancias.filter(d => d.criticidad === 'alta');
    if (discrepanciasAltas.length > 0) {
      alertas.push({
        tipo: 'inconsistencia_datos',
        descripcion: `${discrepanciasAltas.length} discrepancias críticas encontradas`,
        criticidad: 'alta',
        accionRecomendada: 'Revisar manualmente y solicitar aclaraciones al cliente'
      });
    }

    // Alertas por documentos inválidos
    const documentosInvalidos = validaciones.filter(v => !v.esValido);
    if (documentosInvalidos.length > 0) {
      alertas.push({
        tipo: 'documento_invalido',
        descripcion: `${documentosInvalidos.length} documentos no pasaron la validación`,
        criticidad: 'alta',
        accionRecomendada: 'Solicitar documentos válidos y legibles'
      });
    }

    // Alerta por posible fraude (múltiples discrepancias críticas)
    if (discrepanciasAltas.length >= 3) {
      alertas.push({
        tipo: 'posible_fraude',
        descripcion: 'Múltiples inconsistencias críticas detectadas',
        criticidad: 'alta',
        accionRecomendada: 'Escalar a equipo de fraude para revisión detallada'
      });
    }

    return alertas;
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  private generarRecomendaciones(tipoPersona: string, discrepancias: Discrepancia[], alertas: AlertaRiesgo[]): string[] {
    const recomendaciones: string[] = [];

    // Recomendaciones generales
    if (discrepancias.length === 0) {
      recomendaciones.push('✅ Todos los documentos son coherentes con los datos del cliente');
    } else {
      recomendaciones.push(`📋 Revisar ${discrepancias.length} discrepancias encontradas`);
    }

    // Recomendaciones por criticidad
    const altaCriticidad = discrepancias.filter(d => d.criticidad === 'alta').length;
    if (altaCriticidad > 0) {
      recomendaciones.push(`🚨 ${altaCriticidad} discrepancias críticas requieren atención inmediata`);
    }

    // Recomendaciones específicas por tipo de persona
    switch (tipoPersona) {
      case 'PM':
        recomendaciones.push('📄 Verificar que el representante legal tenga poderes vigentes');
        recomendaciones.push('🏢 Confirmar que la razón social coincida en todos los documentos');
        break;
      case 'PF_AE':
        recomendaciones.push('💼 Validar que la actividad empresarial esté debidamente registrada');
        break;
    }

    // Recomendaciones por alertas de riesgo
    if (alertas.some(a => a.tipo === 'posible_fraude')) {
      recomendaciones.push('🔍 Realizar verificación adicional por posible fraude');
    }

    return recomendaciones;
  }

  /**
   * Normaliza texto para comparaciones
   */
  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, '') // Remover puntuación
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Compara direcciones con tolerancia a diferencias menores
   */
  private compararDirecciones(direccion1: string, direccion2: string): boolean {
    const norm1 = this.normalizarTexto(direccion1);
    const norm2 = this.normalizarTexto(direccion2);

    // Comparación exacta
    if (norm1 === norm2) return true;

    // Comparación por palabras clave (al menos 70% de coincidencia)
    const palabras1 = norm1.split(' ').filter(p => p.length > 2);
    const palabras2 = norm2.split(' ').filter(p => p.length > 2);

    const coincidencias = palabras1.filter(p => 
      palabras2.some(p2 => p2.includes(p) || p.includes(p2))
    ).length;

    const porcentajeCoincidencia = coincidencias / Math.max(palabras1.length, palabras2.length);
    return porcentajeCoincidencia >= 0.7;
  }
}

export const coherenciaService = new CoherenciaService();
