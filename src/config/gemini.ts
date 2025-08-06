import axios = require('axios');
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Sistema de cache simple en memoria
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  
  set(key: string, value: any, ttlSeconds: number = 900): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data: value, expiry });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  getStats(): any {
    return {
      type: 'memory',
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cache = new SimpleCache();

// TTL constants
const TTL = {
  SHORT: 300,    // 5 minutos
  MEDIUM: 900,   // 15 minutos
  LONG: 3600,    // 1 hora
} as const;

// Sistema de logging integrado
const Logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  error: (message: string, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
    }
  }
};

// Configuración optimizada de Gemini
const GEMINI_CONFIG = {
  apiKey: process.env.GEMINI_API_KEY || '',
  projectId: process.env.GOOGLE_PROJECT_ID || '',
  apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
  model: 'gemini-1.5-flash-latest',
  timeout: 45000, // 45 segundos
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  maxTokens: 8192,
  temperature: 0.1 // Más determinístico para análisis de documentos
} as const;

// Validación de configuración
if (!GEMINI_CONFIG.apiKey) {
  throw new Error('GEMINI_API_KEY es requerida en las variables de entorno');
}

// Tipos de documentos mexicanos soportados
export const TIPOS_DOCUMENTO_MEXICANO = {
  INE: 'ine',
  RFC: 'rfc',
  CURP: 'curp',
  ACTA_CONSTITUTIVA: 'acta_constitutiva',
  COMPROBANTE_DOMICILIO: 'comprobante_domicilio',
  ESTADO_CUENTA: 'estado_cuenta',
  COMPROBANTE_INGRESOS: 'comprobante_ingresos'
} as const;

export type TipoDocumentoMexicano = typeof TIPOS_DOCUMENTO_MEXICANO[keyof typeof TIPOS_DOCUMENTO_MEXICANO];

// Mapeo de tipos de documento Gemini a IDs de base de datos
export const DOCUMENTO_TIPO_MAP = {
  [TIPOS_DOCUMENTO_MEXICANO.INE]: 1,
  [TIPOS_DOCUMENTO_MEXICANO.CURP]: 2,
  [TIPOS_DOCUMENTO_MEXICANO.RFC]: 3, // Constancia de Situación Fiscal
  [TIPOS_DOCUMENTO_MEXICANO.COMPROBANTE_INGRESOS]: 5,
  [TIPOS_DOCUMENTO_MEXICANO.ESTADO_CUENTA]: 6,
  [TIPOS_DOCUMENTO_MEXICANO.COMPROBANTE_DOMICILIO]: 8,
  [TIPOS_DOCUMENTO_MEXICANO.ACTA_CONSTITUTIVA]: 999 // Para PM, necesita crearse si no existe
} as const;

// Interfaz mejorada para la respuesta de análisis de documento
export interface DocumentAnalysisResponse {
  esValido: boolean;
  documentoTipoId: number; // ID de la base de datos
  tipoDocumento: string;
  vigencia: {
    esVigente: boolean;
    fechaDocumento: string; // Fecha extraída del documento
    fechaVencimiento: string | null; // Calculada según tipo
    diasRestantes: number | null;
    requiereRenovacion: boolean;
  };
  datosExtraidos: {
    [key: string]: any; // Datos específicos por tipo de documento
  };
  coherenciaCliente: {
    esCoherente: boolean;
    camposValidados: string[];
    discrepancias: Array<{
      campo: string;
      valorCliente: any;
      valorDocumento: any;
      criticidad: "alta" | "media" | "baja";
    }>;
  };
  calidad: {
    puntuacion: number; // 0-100
    factores: {
      legibilidad: number;
      resolucion: number;
      completitud: number;
      autenticidad: number;
    };
    recomendaciones: string[];
  };
  metadatos: {
    timestamp: string;
    modelo: string;
    tiempoAnalisis: number;
    confianza: number; // 0-100
  };
}

// Cliente HTTP optimizado para Gemini API
export const geminiClient = axios.create({
  baseURL: GEMINI_CONFIG.apiUrl,
  timeout: GEMINI_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'OnboardingDigital/1.0',
    'Accept': 'application/json'
  },
  params: {
    key: GEMINI_CONFIG.apiKey
  }
});

// Interceptor para logging de requests
geminiClient.interceptors.request.use(
  (config: any) => {
    Logger.debug('Enviando solicitud a Gemini API', {
      url: config.url,
      method: config.method,
      timestamp: new Date().toISOString()
    });
    return config;
  },
  (error: any) => {
    Logger.error('Error en request a Gemini API', { error: error.message });
    return Promise.reject(error);
  }
);

// Interceptor para logging de responses
geminiClient.interceptors.response.use(
  (response: any) => {
    Logger.debug('Respuesta recibida de Gemini API', {
      status: response.status,
      timestamp: new Date().toISOString()
    });
    return response;
  },
  (error: any) => {
    Logger.error('Error en respuesta de Gemini API', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      timestamp: new Date().toISOString()
    });
    return Promise.reject(error);
  }
);

// Función para generar prompts especializados por tipo de documento
function generarPromptDocumento(tipoDocumento: TipoDocumentoMexicano, clienteData?: any): string {
  const basePrompt = `
Eres un experto analista de documentos mexicanos. Analiza el documento proporcionado y proporciona un análisis detallado en formato JSON.

IMPORTANTE: 
- Responde ÚNICAMENTE con un objeto JSON válido
- No incluyas texto adicional antes o después del JSON
- Usa el formato exacto especificado

Tipo de documento esperado: ${tipoDocumento.toUpperCase()}
${clienteData ? `Datos del cliente para verificar coherencia: ${JSON.stringify(clienteData)}` : ''}

Formato de respuesta requerido:
{
  "esValido": boolean,
  "documentoTipoId": ${DOCUMENTO_TIPO_MAP[tipoDocumento] || 'number'},
  "tipoDocumento": "${tipoDocumento}",
  "vigencia": {
    "esVigente": boolean,
    "fechaDocumento": "YYYY-MM-DD",
    "fechaVencimiento": "YYYY-MM-DD o null",
    "diasRestantes": number,
    "requiereRenovacion": boolean
  },
  "datosExtraidos": {
    // Datos específicos según el tipo de documento
  },
  "coherenciaCliente": {
    "esCoherente": boolean,
    "camposValidados": ["lista de campos validados"],
    "discrepancias": [
      {
        "campo": "string",
        "valorCliente": "any",
        "valorDocumento": "any", 
        "criticidad": "alta|media|baja"
      }
    ]
  },
  "calidad": {
    "puntuacion": number, // 0-100
    "factores": {
      "legibilidad": number,
      "resolucion": number,
      "completitud": number,
      "autenticidad": number
    },
    "recomendaciones": ["lista de recomendaciones"]
  },
  "metadatos": {
    "confianza": number // 0-100, nivel de confianza en el análisis
  }
}
`;

  const promptsEspecificos = {
    [TIPOS_DOCUMENTO_MEXICANO.INE]: `
${basePrompt}

Para INE/IFE (documento_tipo_id: 1), extrae los siguientes datos exactos:
- nombre: string
- apellidoPaterno: string  
- apellidoMaterno: string
- fechaNacimiento: "YYYY-MM-DD"
- claveElector: string
- curp: string (18 caracteres)
- domicilio: {
    calle: string,
    numeroExterior: string,
    colonia: string,
    codigoPostal: string (5 dígitos),
    municipio: string,
    estado: string
  }
- vigencia: "YYYY-MM-DD"
- numeroEmision: string
- sexo: "H" | "M"

VALIDACIONES ESPECÍFICAS:
1. Verificar que la vigencia no haya expirado (debe ser válida por 365 días desde emisión)
2. Validar formato CURP (18 caracteres alfanuméricos)
3. Validar código postal (exactamente 5 dígitos)
4. Comparar nombre completo con datos del cliente
5. Verificar coherencia entre fecha nacimiento en INE vs fecha nacimiento del cliente
6. Validar domicilio contra domicilio registrado del cliente

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.nombre ↔ datosExtraidos.nombre
- cliente.apellido_paterno ↔ datosExtraidos.apellidoPaterno
- cliente.apellido_materno ↔ datosExtraidos.apellidoMaterno
- cliente.fecha_nacimiento ↔ datosExtraidos.fechaNacimiento
- cliente.curp ↔ datosExtraidos.curp
- cliente.calle ↔ datosExtraidos.domicilio.calle
- cliente.codigo_postal ↔ datosExtraidos.domicilio.codigoPostal
`,

    [TIPOS_DOCUMENTO_MEXICANO.RFC]: `
${basePrompt}

Para Constancia de Situación Fiscal (documento_tipo_id: 3), extrae:
- rfc: string (13 chars para PF, 12 chars para PM)
- nombre: string (para PF)
- apellidoPaterno: string (para PF)
- apellidoMaterno: string (para PF)
- razonSocial: string (para PM)
- regimenFiscal: string
- fechaInicioOperaciones: "YYYY-MM-DD"
- situacionContribuyente: string ("Activo", "Suspendido", etc.)
- domicilioFiscal: {
    calle: string,
    numeroExterior: string,
    colonia: string,
    codigoPostal: string,
    municipio: string,
    estado: string
  }
- fechaEmision: "YYYY-MM-DD"

VALIDACIONES ESPECÍFICAS:
1. Verificar que RFC tenga formato válido (13 chars PF, 12 chars PM)
2. Validar que situacionContribuyente sea "Activo"
3. Verificar vigencia (30 días desde fecha_emision)
4. Comparar RFC con cliente.rfc
5. Para PF: validar nombre completo vs cliente
6. Para PM: validar razonSocial vs cliente.razon_social

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.rfc ↔ datosExtraidos.rfc
- cliente.tipo_persona = 'PF'/'PF_AE': validar nombre vs cliente
- cliente.tipo_persona = 'PM': validar razonSocial vs cliente.razon_social
`,

    [TIPOS_DOCUMENTO_MEXICANO.CURP]: `
${basePrompt}

Para CURP (documento_tipo_id: 2), extrae:
- curp: string (exactamente 18 caracteres)
- nombre: string
- apellidoPaterno: string
- apellidoMaterno: string
- fechaNacimiento: "YYYY-MM-DD"
- sexo: "H" | "M"
- lugarNacimiento: string
- fechaRegistro: "YYYY-MM-DD"
- folio: string

VALIDACIONES ESPECÍFICAS:
1. Validar formato CURP (exactamente 18 caracteres alfanuméricos)
2. Verificar coherencia fecha nacimiento vs estructura CURP
3. Validar que el sexo coincida con estructura CURP
4. Comparar con datos del cliente
5. CURP no caduca (vigencia permanente)

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.curp ↔ datosExtraidos.curp
- cliente.nombre ↔ datosExtraidos.nombre
- cliente.apellido_paterno ↔ datosExtraidos.apellidoPaterno
- cliente.apellido_materno ↔ datosExtraidos.apellidoMaterno
- cliente.fecha_nacimiento ↔ datosExtraidos.fechaNacimiento
`,

    [TIPOS_DOCUMENTO_MEXICANO.COMPROBANTE_DOMICILIO]: `
${basePrompt}

Para Comprobante de Domicilio (documento_tipo_id: 8), extrae:
- tipoComprobante: string ("CFE", "Telmex", "Gas Natural", "Agua", etc.)
- nombreTitular: string
- domicilio: {
    calle: string,
    numeroExterior: string,
    numeroInterior: string,
    colonia: string,
    codigoPostal: string,
    municipio: string,
    estado: string
  }
- fechaEmision: "YYYY-MM-DD"
- periodoFacturacion: string
- numeroServicio: string
- monto: number
- fechaVencimiento: "YYYY-MM-DD"

VALIDACIONES ESPECÍFICAS:
1. Verificar vigencia (no mayor a 90 días desde fecha_emision)
2. Validar que nombreTitular coincida con cliente
3. Verificar que domicilio coincida con domicilio registrado del cliente
4. Validar código postal (5 dígitos)

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.nombre + apellidos ↔ datosExtraidos.nombreTitular
- cliente.calle ↔ datosExtraidos.domicilio.calle
- cliente.numero_exterior ↔ datosExtraidos.domicilio.numeroExterior
- cliente.colonia ↔ datosExtraidos.domicilio.colonia
- cliente.codigo_postal ↔ datosExtraidos.domicilio.codigoPostal
- cliente.ciudad ↔ datosExtraidos.domicilio.municipio
- cliente.estado ↔ datosExtraidos.domicilio.estado
`,

    [TIPOS_DOCUMENTO_MEXICANO.ESTADO_CUENTA]: `
${basePrompt}

Para Estado de Cuenta Bancario (documento_tipo_id: 6), extrae:
- banco: string
- titular: string
- numeroCuenta: string (solo últimos 4 dígitos por seguridad)
- periodo: "YYYY-MM"
- fechaEmision: "YYYY-MM-DD"
- saldoInicial: number
- saldoFinal: number
- saldoPromedio: number
- ingresos: number
- egresos: number
- numeroMovimientos: number
- rfcTitular: string

VALIDACIONES ESPECÍFICAS:
1. Verificar vigencia (no mayor a 30 días desde fecha_emision)
2. Validar que titular coincida con cliente
3. Verificar RFC del titular vs cliente.rfc
4. Validar consistencia de montos (saldoInicial + ingresos - egresos = saldoFinal)

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.nombre + apellidos ↔ datosExtraidos.titular
- cliente.rfc ↔ datosExtraidos.rfcTitular
`,

    [TIPOS_DOCUMENTO_MEXICANO.COMPROBANTE_INGRESOS]: `
${basePrompt}

Para Comprobante de Ingresos (documento_tipo_id: 5), extrae:
- tipoComprobante: string ("Nómina", "Honorarios", "Pensión", etc.)
- nombreTrabajador: string
- rfcTrabajador: string
- empleador: string
- rfcEmpleador: string
- periodo: "YYYY-MM"
- fechaEmision: "YYYY-MM-DD"
- sueldoBruto: number
- deducciones: number
- sueldoNeto: number
- puesto: string
- antiguedad: string

VALIDACIONES ESPECÍFICAS:
1. Verificar vigencia (no mayor a 30 días desde fecha_emision)
2. Validar que nombreTrabajador coincida con cliente
3. Verificar RFC del trabajador vs cliente.rfc
4. Validar consistencia (sueldoBruto - deducciones = sueldoNeto)

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.nombre + apellidos ↔ datosExtraidos.nombreTrabajador
- cliente.rfc ↔ datosExtraidos.rfcTrabajador
`,

    [TIPOS_DOCUMENTO_MEXICANO.ACTA_CONSTITUTIVA]: `
${basePrompt}

Para Acta Constitutiva (documento_tipo_id: PM), extrae:
- denominacionSocial: string
- fechaConstitucion: "YYYY-MM-DD"
- notario: string
- numeroEscritura: string
- fechaEscritura: "YYYY-MM-DD"
- representanteLegal: string
- objetoSocial: string
- capitalSocial: number
- monedaCapital: string
- domicilioSocial: {
    calle: string,
    numero: string,
    colonia: string,
    codigoPostal: string,
    municipio: string,
    estado: string
  }
- duracionSociedad: string
- rfc: string

VALIDACIONES ESPECÍFICAS:
1. Validar que es documento válido (acta constitutiva notarizada)
2. Verificar que denominacionSocial coincida con cliente.razon_social
3. Validar que representanteLegal coincida con cliente.representante_legal
4. Verificar fecha_constitucion vs cliente.fecha_constitucion
5. Este documento no caduca (vigencia permanente)

CAMPOS A VALIDAR DEL CLIENTE:
- cliente.razon_social ↔ datosExtraidos.denominacionSocial
- cliente.representante_legal ↔ datosExtraidos.representanteLegal
- cliente.fecha_constitucion ↔ datosExtraidos.fechaConstitucion
- cliente.rfc ↔ datosExtraidos.rfc (si aparece en el acta)
`
  } as const;

  return (promptsEspecificos as any)[tipoDocumento] || basePrompt;
}

// Función principal optimizada para procesar documentos
export async function processDocument(
  documentoBase64: string,
  tipoDocumento: TipoDocumentoMexicano,
  clienteData?: any,
  useCache: boolean = true
): Promise<DocumentAnalysisResponse> {
  const startTime = Date.now();
  
  try {
    // Generar clave de cache
    const cacheKey = `gemini:analysis:${tipoDocumento}:${Buffer.from(documentoBase64).toString('base64').slice(0, 32)}`;
    
    // Verificar cache si está habilitado
    if (useCache) {
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        Logger.info('Resultado obtenido desde cache', { tipoDocumento });
        return cachedResult;
      }
    }

    Logger.info('Iniciando análisis de documento con Gemini', {
      tipoDocumento,
      timestamp: new Date().toISOString(),
      hasClienteData: !!clienteData
    });

    // Validar formato base64
    if (!documentoBase64 || !documentoBase64.includes(',')) {
      throw new Error('Formato de documento base64 inválido');
    }

    const [header, data] = documentoBase64.split(',');
    const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

    // Validar tipo MIME
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(mimeType)) {
      throw new Error(`Tipo de archivo no soportado: ${mimeType}`);
    }

    // Preparar prompt especializado
    const prompt = generarPromptDocumento(tipoDocumento, clienteData);

    // Preparar request para Gemini
    const requestPayload = {
      contents: [{
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: GEMINI_CONFIG.temperature,
        maxOutputTokens: GEMINI_CONFIG.maxTokens,
        topK: 40,
        topP: 0.95
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // Realizar solicitud con reintentos
    let lastError: any;
    for (let attempt = 1; attempt <= GEMINI_CONFIG.maxRetries; attempt++) {
      try {
        Logger.debug(`Intento ${attempt} de análisis con Gemini`, { tipoDocumento });
        
        const response = await geminiClient.post(
          `/models/${GEMINI_CONFIG.model}:generateContent`,
          requestPayload
        );

        const generatedContent = (response.data as any)?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!generatedContent) {
          throw new Error('Gemini API no devolvió contenido válido');
        }

        // Parsear respuesta JSON
        let analysis: DocumentAnalysisResponse;
        try {
          // Limpiar respuesta de posibles caracteres extra
          const cleanJson = generatedContent.trim().replace(/```json\s*|\s*```/g, '');
          analysis = JSON.parse(cleanJson);
        } catch (parseError) {
          Logger.error('Error al parsear respuesta JSON de Gemini', {
            rawResponse: generatedContent,
            parseError: (parseError as Error).message
          });
          throw new Error('Respuesta de Gemini no es JSON válido');
        }

        // Validar estructura de respuesta
        if (typeof analysis.esValido !== 'boolean' || 
            !analysis.tipoDocumento || 
            typeof analysis.documentoTipoId !== 'number' ||
            !analysis.vigencia ||
            !analysis.datosExtraidos ||
            !analysis.coherenciaCliente ||
            !analysis.calidad) {
          throw new Error('Estructura de respuesta inválida de Gemini');
        }

        // Añadir metadatos
        analysis.metadatos = {
          timestamp: new Date().toISOString(),
          modelo: GEMINI_CONFIG.model,
          tiempoAnalisis: Date.now() - startTime,
          confianza: (analysis.metadatos as any)?.confianza || 85 // Default si no viene en la respuesta
        };

        // Guardar en cache si está habilitado
        if (useCache) {
          cache.set(cacheKey, analysis, TTL.MEDIUM);
        }

        Logger.info('Documento procesado exitosamente', {
          tipoDocumento,
          esValido: analysis.esValido,
          calificacionCalidad: analysis.calidad.puntuacion,
          tiempoAnalisis: analysis.metadatos.tiempoAnalisis
        });

        return analysis;

      } catch (error: any) {
        lastError = error;
        Logger.warn(`Intento ${attempt} falló`, { 
          error: error.message,
          tipoDocumento
        });

        if (attempt < GEMINI_CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, GEMINI_CONFIG.retryDelay * attempt));
        }
      }
    }

    throw lastError;

  } catch (error: any) {
    const errorMessage = error?.response?.status 
      ? `Error de API: ${error.response.status} - ${error.response.statusText}`
      : `Error general: ${error?.message || 'Error desconocido'}`;

    Logger.error('Error al procesar documento con Gemini API', {
      error: errorMessage,
      tipoDocumento,
      timestamp: new Date().toISOString(),
      tiempoTranscurrido: Date.now() - startTime
    });

    throw new Error(`No se pudo procesar el documento: ${errorMessage}`);
  }
}

// Función para verificar salud de Gemini API
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await geminiClient.get(`/models/${GEMINI_CONFIG.model}`);
    Logger.info('Health check de Gemini API exitoso');
    return response.status === 200;
  } catch (error: any) {
    Logger.error('Health check de Gemini API falló', {
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
}

// Función para obtener modelos disponibles
export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await geminiClient.get('/models');
    const models = (response.data as any)?.models?.map((model: any) => model.name) || [];
    Logger.info('Modelos disponibles obtenidos', { count: models.length });
    return models;
  } catch (error: any) {
    Logger.error('Error al obtener modelos disponibles de Gemini', {
      error: error.message
    });
    return [];
  }
}

// Función para limpiar cache de análisis
export function clearAnalysisCache(tipoDocumento?: TipoDocumentoMexicano): void {
  try {
    cache.clear();
    Logger.info('Cache de análisis limpiado');
  } catch (error: any) {
    Logger.error('Error al limpiar cache de análisis', {
      error: error.message,
      tipoDocumento
    });
  }
}

// Función para obtener estadísticas de uso
export function getUsageStats(): any {
  return {
    config: {
      model: GEMINI_CONFIG.model,
      timeout: GEMINI_CONFIG.timeout,
      maxRetries: GEMINI_CONFIG.maxRetries
    },
    cache: cache.getStats(),
    timestamp: new Date().toISOString()
  };
}

// Exportar configuración para uso externo
export { GEMINI_CONFIG, Logger };
