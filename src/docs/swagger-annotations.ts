/**
 * @swagger
 * /api/usuarios/login:
 *   post:
 *     tags:
 *       - Autenticación
 *     summary: Autenticación de usuario
 *     description: Autentica un usuario y devuelve un token JWT para acceder a endpoints protegidos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             admin:
 *               summary: Login como administrador
 *               value:
 *                 email: "admin@empresa.com"
 *                 password: "password123"
 *             operador:
 *               summary: Login como operador
 *               value:
 *                 email: "operador@empresa.com"
 *                 password: "password123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login exitoso"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: "Token JWT para autenticación"
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     usuario:
 *                       $ref: '#/components/schemas/Usuario'
 *                     expiresIn:
 *                       type: string
 *                       example: "24h"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Credenciales inválidas"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     tags:
 *       - Clientes
 *     summary: Listar clientes con filtros
 *     description: Obtiene una lista paginada de clientes con filtros opcionales
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/Page'
 *       - $ref: '#/components/parameters/Limit'
 *       - $ref: '#/components/parameters/Search'
 *       - name: tipo_persona
 *         in: query
 *         schema:
 *           type: string
 *           enum: [fisica, moral]
 *         description: Filtrar por tipo de persona
 *       - name: estatus
 *         in: query
 *         schema:
 *           type: string
 *           enum: [activo, inactivo, suspendido]
 *         description: Filtrar por estatus
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *           enum: [fecha_registro, nombre, rfc, email]
 *           default: fecha_registro
 *         description: Campo para ordenar
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Orden de clasificación
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Clientes obtenidos exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     clientes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Cliente'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   post:
 *     tags:
 *       - Clientes
 *     summary: Crear nuevo cliente
 *     description: Crea un nuevo cliente (Persona Física o Moral) con validaciones de negocio
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/ClientePersonaFisica'
 *               - $ref: '#/components/schemas/ClientePersonaMoral'
 *           examples:
 *             persona_fisica:
 *               summary: Crear Persona Física
 *               value:
 *                 tipo_persona: "fisica"
 *                 rfc: "JUPA850101ABC"
 *                 email: "juan.perez@email.com"
 *                 telefono: "+52 55 1234 5678"
 *                 nombre: "Juan"
 *                 apellido_paterno: "Pérez"
 *                 apellido_materno: "García"
 *                 fecha_nacimiento: "1985-01-01"
 *                 ingreso:
 *                   ingreso_mensual: 25000.00
 *                   ingreso_anual: 300000.00
 *                   actividad_economica: "Empleado"
 *                   sector_economico: "Servicios"
 *             persona_moral:
 *               summary: Crear Persona Moral
 *               value:
 *                 tipo_persona: "moral"
 *                 rfc: "EMP850101AB1"
 *                 email: "contacto@empresa.com.mx"
 *                 telefono: "+52 55 9876 5432"
 *                 razon_social: "Empresa de Servicios S.A. de C.V."
 *                 fecha_constitucion: "1985-01-01"
 *                 ingreso:
 *                   ingreso_anual: 5000000.00
 *                   actividad_economica: "Servicios Profesionales"
 *                   sector_economico: "Servicios"
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cliente creado exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Cliente'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         description: RFC o email ya existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El RFC ya está registrado"
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "RFC_DUPLICADO"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     tags:
 *       - Clientes
 *     summary: Obtener cliente por ID
 *     description: Obtiene la información completa de un cliente incluyendo documentos y solicitudes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ClienteId'
 *     responses:
 *       200:
 *         description: Información del cliente obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Cliente obtenido exitosamente"
 *                 data:
 *                   type: object
 *                   allOf:
 *                     - $ref: '#/components/schemas/Cliente'
 *                     - type: object
 *                       properties:
 *                         ingresos:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               ingreso_mensual:
 *                                 type: number
 *                               fecha_registro:
 *                                 type: string
 *                                 format: date-time
 *                         documentos:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Documento'
 *                         solicitudes:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               solicitud_id:
 *                                 type: integer
 *                               folio:
 *                                 type: string
 *                               estatus:
 *                                 type: string
 *                               productos:
 *                                 type: array
 *                                 items:
 *                                   type: string
 *                         completitud:
 *                           type: object
 *                           properties:
 *                             porcentaje:
 *                               type: number
 *                             documentos_faltantes:
 *                               type: integer
 *                             documentos_vencidos:
 *                               type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/documentos/upload:
 *   post:
 *     tags:
 *       - Documentos
 *     summary: Subir documento
 *     description: Sube un documento para un cliente con validaciones automáticas de formato y tamaño
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/DocumentoUpload'
 *           encoding:
 *             archivo:
 *               contentType: application/pdf, image/jpeg, image/png
 *     responses:
 *       201:
 *         description: Documento subido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Documento subido exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Documento'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       413:
 *         description: Archivo muy grande
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "El archivo excede el tamaño máximo permitido (5MB)"
 *       415:
 *         description: Formato de archivo no permitido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Formato de archivo no permitido. Usar: PDF, JPG, PNG"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/solicitudes:
 *   post:
 *     tags:
 *       - Solicitudes
 *     summary: Crear nueva solicitud
 *     description: Crea una nueva solicitud de productos financieros para un cliente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SolicitudCreate'
 *           examples:
 *             cuenta_ahorro:
 *               summary: Solicitud de Cuenta de Ahorro
 *               value:
 *                 cliente_id: 1
 *                 productos:
 *                   - producto: "CS"
 *                     monto_solicitado: 0
 *                     observaciones: "Cuenta de ahorro básica"
 *                 observaciones: "Cliente referido por sucursal"
 *             financiamiento:
 *               summary: Solicitud de Financiamiento Automotriz
 *               value:
 *                 cliente_id: 1
 *                 productos:
 *                   - producto: "FA"
 *                     monto_solicitado: 350000.00
 *                     plazo_meses: 48
 *                     observaciones: "Financiamiento para vehículo nuevo"
 *                 observaciones: "Cliente con historial crediticio excelente"
 *             multiple:
 *               summary: Solicitud Múltiple
 *               value:
 *                 cliente_id: 1
 *                 productos:
 *                   - producto: "CS"
 *                     monto_solicitado: 0
 *                   - producto: "CC"
 *                     monto_solicitado: 50000.00
 *                 observaciones: "Paquete completo de productos"
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud creada exitosamente"
 *                 data:
 *                   $ref: '#/components/schemas/Solicitud'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Health check del sistema
 *     description: Verifica el estado de salud de todos los componentes del sistema
 *     responses:
 *       200:
 *         description: Sistema funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *             examples:
 *               healthy:
 *                 summary: Sistema saludable
 *                 value:
 *                   status: "healthy"
 *                   timestamp: "2025-07-21T15:30:00.000Z"
 *                   version: "1.2.3"
 *                   uptime: 86400
 *                   environment: "production"
 *                   checks:
 *                     database:
 *                       status: "healthy"
 *                       responseTime: 45
 *                       details:
 *                         connection: "active"
 *                         poolSize: 8
 *                         activeConnections: 3
 *                     cache:
 *                       status: "healthy"
 *                       responseTime: 12
 *                       details:
 *                         type: "redis"
 *                         memory: "245MB"
 *                         keyCount: 1547
 *                     storage:
 *                       status: "healthy"
 *                       details:
 *                         provider: "Google Cloud Storage"
 *                         bucket: "onboarding-documentos-prod"
 *                         connectivity: "ok"
 *               degraded:
 *                 summary: Sistema con problemas menores
 *                 value:
 *                   status: "degraded"
 *                   timestamp: "2025-07-21T15:30:00.000Z"
 *                   version: "1.2.3"
 *                   uptime: 86400
 *                   environment: "production"
 *                   checks:
 *                     database:
 *                       status: "healthy"
 *                       responseTime: 45
 *                     cache:
 *                       status: "degraded"
 *                       responseTime: 250
 *                       details:
 *                         type: "fallback"
 *                         reason: "Redis connection timeout"
 *                     memory:
 *                       status: "degraded"
 *                       details:
 *                         used: "1.8GB"
 *                         total: "2GB"
 *                         percentage: 90.5
 *       503:
 *         description: Sistema no disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "unhealthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "unhealthy"
 *                         error:
 *                           type: string
 *                           example: "Connection refused"
 */
