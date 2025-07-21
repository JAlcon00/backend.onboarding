import swaggerJSDoc from 'swagger-jsdoc';
import { SwaggerUiOptions } from 'swagger-ui-express';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'OnboardingDigital Backend API',
    version: '1.2.3',
    description: `
# 🏦 API REST para Onboarding Digital de Clientes

Sistema empresarial para la gestión completa del onboarding de clientes del sector financiero.

## 🎯 Funcionalidades Principales
- **Gestión Integral de Clientes**: Registro, validación y administración de PF/PM
- **Sistema KYC Completo**: Upload, validación y aprobación de documentos
- **Workflow de Solicitudes**: Gestión de productos financieros (CS, CC, FA, AR)
- **Autenticación & Autorización**: JWT con RBAC (Role-Based Access Control)

## 🔐 Autenticación
Esta API utiliza **JWT Bearer tokens** para autenticación. Para acceder a los endpoints protegidos:

1. Realizar login en \`POST /api/usuarios/login\`
2. Usar el token recibido en el header: \`Authorization: Bearer {token}\`

## 📋 Códigos de Respuesta
- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Error de validación o datos incorrectos
- **401**: No autenticado o token inválido
- **403**: No autorizado para esta operación
- **404**: Recurso no encontrado
- **409**: Conflicto (ej: RFC duplicado)
- **422**: Error de validación de datos
- **429**: Límite de rate limiting excedido
- **500**: Error interno del servidor
    `,
    contact: {
      name: 'Equipo de Desarrollo OnboardingDigital',
      email: 'dev-team@empresa.com',
      url: 'https://github.com/tu-empresa/onboarding-backend'
    },
    license: {
      name: 'Propietario',
      url: 'https://empresa.com/license'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Servidor de Desarrollo'
    },
    {
      url: 'https://api-staging.onboarding.empresa.com',
      description: 'Servidor de Staging'
    },
    {
      url: 'https://api.onboarding.empresa.com',
      description: 'Servidor de Producción'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtenido del endpoint de login'
      }
    },
    schemas: {
      // Schemas base
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indica si la operación fue exitosa'
          },
          message: {
            type: 'string',
            description: 'Mensaje descriptivo del resultado'
          },
          data: {
            type: 'object',
            description: 'Datos de la respuesta'
          },
          error: {
            type: 'object',
            description: 'Detalles del error (solo en caso de error)',
            properties: {
              code: { type: 'string' },
              details: { type: 'string' }
            }
          }
        },
        required: ['success', 'message']
      },
      
      // Paginación
      PaginationMeta: {
        type: 'object',
        properties: {
          total: {
            type: 'integer',
            description: 'Total de registros'
          },
          page: {
            type: 'integer',
            description: 'Página actual'
          },
          limit: {
            type: 'integer',
            description: 'Registros por página'
          },
          pages: {
            type: 'integer',
            description: 'Total de páginas'
          },
          hasNext: {
            type: 'boolean',
            description: 'Tiene página siguiente'
          },
          hasPrev: {
            type: 'boolean',
            description: 'Tiene página anterior'
          }
        }
      },

      // Usuario y Autenticación
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario',
            example: 'admin@empresa.com'
          },
          password: {
            type: 'string',
            minLength: 8,
            description: 'Contraseña del usuario',
            example: 'password123'
          }
        }
      },

      Usuario: {
        type: 'object',
        properties: {
          usuario_id: {
            type: 'integer',
            description: 'ID único del usuario'
          },
          nombre: {
            type: 'string',
            description: 'Nombre completo del usuario'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico'
          },
          rol: {
            type: 'string',
            enum: ['SUPER', 'ADMIN', 'AUDITOR', 'OPERADOR'],
            description: 'Rol del usuario en el sistema'
          },
          permisos: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['create', 'read', 'update', 'delete', 'admin']
            },
            description: 'Permisos específicos del usuario'
          },
          activo: {
            type: 'boolean',
            description: 'Estado activo del usuario'
          },
          fecha_registro: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de registro del usuario'
          }
        }
      },

      // Cliente
      ClientePersonaFisica: {
        type: 'object',
        required: ['tipo_persona', 'rfc', 'email', 'nombre', 'apellido_paterno', 'fecha_nacimiento'],
        properties: {
          tipo_persona: {
            type: 'string',
            enum: ['fisica'],
            description: 'Tipo de persona'
          },
          rfc: {
            type: 'string',
            pattern: '^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$',
            description: 'RFC de 13 caracteres para persona física',
            example: 'JUPA850101ABC'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico único',
            example: 'juan.perez@email.com'
          },
          telefono: {
            type: 'string',
            pattern: '^\\+52 [0-9]{2} [0-9]{4} [0-9]{4}$',
            description: 'Teléfono en formato mexicano',
            example: '+52 55 1234 5678'
          },
          nombre: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            description: 'Nombre de la persona'
          },
          apellido_paterno: {
            type: 'string',
            minLength: 2,
            maxLength: 50,
            description: 'Apellido paterno'
          },
          apellido_materno: {
            type: 'string',
            maxLength: 50,
            description: 'Apellido materno (opcional)'
          },
          fecha_nacimiento: {
            type: 'string',
            format: 'date',
            description: 'Fecha de nacimiento (mínimo 18 años)',
            example: '1985-01-01'
          },
          ingreso: {
            $ref: '#/components/schemas/IngresoPersonaFisica'
          }
        }
      },

      ClientePersonaMoral: {
        type: 'object',
        required: ['tipo_persona', 'rfc', 'email', 'razon_social', 'fecha_constitucion'],
        properties: {
          tipo_persona: {
            type: 'string',
            enum: ['moral'],
            description: 'Tipo de persona'
          },
          rfc: {
            type: 'string',
            pattern: '^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$',
            description: 'RFC de 12 caracteres para persona moral',
            example: 'EMP850101AB1'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico único',
            example: 'contacto@empresa.com.mx'
          },
          telefono: {
            type: 'string',
            pattern: '^\\+52 [0-9]{2} [0-9]{4} [0-9]{4}$',
            description: 'Teléfono en formato mexicano'
          },
          razon_social: {
            type: 'string',
            minLength: 5,
            maxLength: 100,
            description: 'Razón social de la empresa'
          },
          fecha_constitucion: {
            type: 'string',
            format: 'date',
            description: 'Fecha de constitución de la empresa'
          },
          ingreso: {
            $ref: '#/components/schemas/IngresoPersonaMoral'
          }
        }
      },

      IngresoPersonaFisica: {
        type: 'object',
        properties: {
          ingreso_mensual: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            description: 'Ingreso mensual en MXN'
          },
          ingreso_anual: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            description: 'Ingreso anual en MXN'
          },
          actividad_economica: {
            type: 'string',
            description: 'Actividad económica principal'
          },
          sector_economico: {
            type: 'string',
            description: 'Sector económico'
          }
        }
      },

      IngresoPersonaMoral: {
        type: 'object',
        properties: {
          ingreso_anual: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            description: 'Ingreso anual de la empresa en MXN'
          },
          actividad_economica: {
            type: 'string',
            description: 'Actividad económica principal'
          },
          sector_economico: {
            type: 'string',
            description: 'Sector económico'
          }
        }
      },

      Cliente: {
        type: 'object',
        properties: {
          cliente_id: {
            type: 'integer',
            description: 'ID único del cliente'
          },
          tipo_persona: {
            type: 'string',
            enum: ['fisica', 'moral'],
            description: 'Tipo de persona'
          },
          rfc: {
            type: 'string',
            description: 'Registro Federal de Contribuyentes'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico'
          },
          estatus: {
            type: 'string',
            enum: ['activo', 'inactivo', 'suspendido'],
            description: 'Estado del cliente'
          },
          fecha_registro: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de registro'
          },
          completitud_documentos: {
            type: 'number',
            format: 'float',
            minimum: 0,
            maximum: 100,
            description: 'Porcentaje de completitud de documentos'
          },
          solicitudes_activas: {
            type: 'integer',
            description: 'Número de solicitudes activas'
          }
        }
      },

      // Documentos
      DocumentoUpload: {
        type: 'object',
        required: ['cliente_id', 'documento_tipo_id', 'archivo'],
        properties: {
          cliente_id: {
            type: 'integer',
            description: 'ID del cliente'
          },
          documento_tipo_id: {
            type: 'integer',
            description: 'ID del tipo de documento'
          },
          archivo: {
            type: 'string',
            format: 'binary',
            description: 'Archivo a subir (PDF, JPG, PNG)'
          },
          fecha_documento: {
            type: 'string',
            format: 'date',
            description: 'Fecha del documento'
          },
          observaciones: {
            type: 'string',
            description: 'Observaciones adicionales'
          }
        }
      },

      Documento: {
        type: 'object',
        properties: {
          documento_id: {
            type: 'integer',
            description: 'ID único del documento'
          },
          cliente_id: {
            type: 'integer',
            description: 'ID del cliente'
          },
          tipo_documento: {
            type: 'string',
            description: 'Nombre del tipo de documento'
          },
          nombre_archivo: {
            type: 'string',
            description: 'Nombre del archivo'
          },
          tamano_bytes: {
            type: 'integer',
            description: 'Tamaño del archivo en bytes'
          },
          url_acceso: {
            type: 'string',
            format: 'uri',
            description: 'URL de acceso al documento'
          },
          fecha_vencimiento: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de vencimiento'
          },
          estatus: {
            type: 'string',
            enum: ['pendiente', 'aprobado', 'rechazado'],
            description: 'Estado del documento'
          },
          metadata: {
            type: 'object',
            description: 'Metadatos del archivo'
          }
        }
      },

      // Solicitudes
      SolicitudCreate: {
        type: 'object',
        required: ['cliente_id', 'productos'],
        properties: {
          cliente_id: {
            type: 'integer',
            description: 'ID del cliente'
          },
          productos: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ProductoSolicitud'
            },
            description: 'Lista de productos solicitados'
          },
          observaciones: {
            type: 'string',
            description: 'Observaciones de la solicitud'
          }
        }
      },

      ProductoSolicitud: {
        type: 'object',
        required: ['producto'],
        properties: {
          producto: {
            type: 'string',
            enum: ['CS', 'CC', 'FA', 'AR'],
            description: 'Tipo de producto (CS=Cuenta Ahorro, CC=Cuenta Corriente, FA=Financiamiento Automotriz, AR=Arrendamiento)'
          },
          monto_solicitado: {
            type: 'number',
            format: 'decimal',
            minimum: 0,
            description: 'Monto solicitado (0 para cuentas)'
          },
          plazo_meses: {
            type: 'integer',
            minimum: 1,
            description: 'Plazo en meses (para créditos)'
          },
          observaciones: {
            type: 'string',
            description: 'Observaciones del producto'
          }
        }
      },

      Solicitud: {
        type: 'object',
        properties: {
          solicitud_id: {
            type: 'integer',
            description: 'ID único de la solicitud'
          },
          folio: {
            type: 'string',
            description: 'Folio único de la solicitud'
          },
          cliente_id: {
            type: 'integer',
            description: 'ID del cliente'
          },
          estatus: {
            type: 'string',
            enum: ['iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada'],
            description: 'Estado de la solicitud'
          },
          fecha_solicitud: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha de creación'
          },
          productos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                solicitud_producto_id: { type: 'integer' },
                producto: { type: 'string' },
                monto_solicitado: { type: 'number' },
                plazo_meses: { type: 'integer' },
                estatus: { type: 'string' }
              }
            }
          },
          completitud_documentos: {
            type: 'object',
            properties: {
              porcentaje: { type: 'number' },
              documentos_requeridos: { type: 'integer' },
              documentos_subidos: { type: 'integer' },
              documentos_aprobados: { type: 'integer' }
            }
          }
        }
      },

      // Health Check
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            description: 'Estado general del sistema'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Timestamp del check'
          },
          version: {
            type: 'string',
            description: 'Versión de la aplicación'
          },
          uptime: {
            type: 'integer',
            description: 'Tiempo activo en segundos'
          },
          environment: {
            type: 'string',
            description: 'Entorno de ejecución'
          },
          checks: {
            type: 'object',
            description: 'Detalles de checks individuales'
          }
        }
      },

      // Errores
      ValidationError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Error de validación'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR'
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      },

      UnauthorizedError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Token no válido o expirado'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'UNAUTHORIZED'
              }
            }
          }
        }
      },

      NotFoundError: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            example: 'Recurso no encontrado'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'NOT_FOUND'
              }
            }
          }
        }
      }
    },
    
    responses: {
      UnauthorizedError: {
        description: 'Token no válido o faltante',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/UnauthorizedError'
            }
          }
        }
      },
      ValidationError: {
        description: 'Error de validación de datos',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ValidationError'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/NotFoundError'
            }
          }
        }
      },
      InternalServerError: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Error interno del servidor' },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'INTERNAL_ERROR' }
                  }
                }
              }
            }
          }
        }
      }
    },

    parameters: {
      ClienteId: {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'integer',
          minimum: 1
        },
        description: 'ID único del cliente'
      },
      Page: {
        name: 'page',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1
        },
        description: 'Número de página para paginación'
      },
      Limit: {
        name: 'limit',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 10
        },
        description: 'Número de registros por página'
      },
      Search: {
        name: 'search',
        in: 'query',
        schema: {
          type: 'string',
          minLength: 2
        },
        description: 'Término de búsqueda en nombre, RFC o email'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Autenticación',
      description: 'Endpoints para login y gestión de sesiones'
    },
    {
      name: 'Usuarios',
      description: 'Gestión de usuarios del sistema'
    },
    {
      name: 'Clientes',
      description: 'Gestión de clientes (Personas Físicas y Morales)'
    },
    {
      name: 'Documentos',
      description: 'Upload y gestión de documentos KYC'
    },
    {
      name: 'Solicitudes',
      description: 'Gestión de solicitudes de productos financieros'
    },
    {
      name: 'Health',
      description: 'Monitoreo y health checks del sistema'
    }
  ]
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/modules/*/routes/*.ts',
    './src/controllers/*.ts',
    './src/modules/*/controllers/*.ts'
  ]
};

export const swaggerSpec = swaggerJSDoc(options);

export const swaggerUiOptions: SwaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1976d2 }
    .swagger-ui .scheme-container { background: #fafafa; border: 1px solid #e1e1e1 }
  `,
  customSiteTitle: 'OnboardingDigital API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true
  }
};
