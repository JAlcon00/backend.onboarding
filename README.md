# 🏦 OnboardingDigital Backend API

# 🏦 OnboardingDigital Backend API

## 📋 Descripción Técnica

API REST empresarial de **última generación** para el sistema de **onboarding digital de clientes** del sector financiero, desarrollada con **Node.js + TypeScript**. Proporciona una plataforma completa e inteligente para la gestión de clientes (Personas Físicas y Morales), documentación KYC (Know Your Customer), solicitudes de productos financieros, y administración avanzada de usuarios con control de acceso basado en roles.

### 🎯 Funcionalidades Principales
- **Gestión Integral de Clientes**: Registro, validación y administración avanzada de PF/PM
- **Sistema KYC Inteligente**: Upload, validación automática y aprobación de documentos
- **Workflow de Solicitudes Avanzado**: Gestión completa de productos financieros (CS, CC, FA, AR)
- **Dashboard Ejecutivo**: Métricas en tiempo real y análisis de rentabilidad
- **Autenticación & Autorización**: JWT con RBAC granular (5 niveles de roles)
- **Auditoría Completa**: Logging estructurado y trazabilidad de operaciones
- **Performance Optimizado**: Caché inteligente, rate limiting y monitoring avanzado
- **Inteligencia de Negocio**: Alertas automáticas, asignación inteligente y reportes predictivos

### 🆕 Nuevas Capacidades Administrativas
- **📊 Dashboards Ejecutivos**: Métricas en tiempo real para toma de decisiones
- **💰 Análisis de Rentabilidad**: ROI por producto, segmentación y tendencias
- **👥 Gestión de Carga de Trabajo**: Distribución inteligente y optimización de equipos
- **🚨 Sistema de Alertas Inteligentes**: Detección automática de cuellos de botella
- **📈 Reportes Comparativos**: Análisis período vs período con KPIs automáticos
- **🤖 Asignación Automática**: Algoritmos de distribución de trabajo optimizada
- **📤 Exportación Avanzada**: Datos para BI en múltiples formatos (JSON/CSV)

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **Runtime**: Node.js 18+ con TypeScript 5.x
- **Framework Web**: Express.js con middlewares profesionales
- **Base de Datos**: MySQL 8.x con Sequelize ORM
- **Autenticación**: JWT (JSON Web Tokens) + bcrypt
- **Validación**: Zod schemas con TypeScript integration
- **Storage**: Google Cloud Storage para documentos
- **Logging**: Winston con formato estructurado JSON
- **Caché**: Redis con fallback a memoria local
- **Testing**: Jest + Supertest para testing integral
- **Analytics**: Consultas SQL avanzadas con CTEs y agregaciones complejas

### Patrones de Diseño Implementados
- **Repository Pattern**: Separación de lógica de acceso a datos
- **Service Layer**: Lógica de negocio centralizada y reutilizable
- **Middleware Chain**: Procesamiento modular de requests
- **Error Handling**: Clases de error personalizadas con códigos específicos
- **Rate Limiting**: Protección contra abuso con límites diferenciados
- **Health Checks**: Monitoreo proactivo de componentes
- **CQRS Pattern**: Separación de comandos y consultas para performance
- **Cache Aside**: Estrategia de cacheo inteligente con invalidación automática

### Arquitectura Modular Avanzada
```
src/modules/
├── cliente/           # Gestión integral de clientes
│   ├── cliente.model.ts
│   ├── cliente.service.ts      # 20+ métodos con BI
│   ├── cliente.controller.ts   # 14+ endpoints administrativos
│   └── cliente.routes.ts       # Rutas con autorización granular
├── documento/         # Sistema KYC inteligente
│   ├── documento.service.ts    # 15+ métodos con analytics
│   ├── documento.controller.ts # 12+ endpoints con validaciones
│   └── documento.routes.ts     # Gestión de archivos y aprobaciones
├── solicitud/         # Workflow de productos financieros
│   ├── solicitud.service.ts    # 13+ métodos administrativos
│   ├── solicitud.controller.ts # 15+ endpoints con dashboards
│   └── solicitud.routes.ts     # Rutas especializadas por rol
└── usuario/           # Administración de usuarios y roles
    ├── usuario.service.ts      # Gestión completa de usuarios
    ├── usuario.controller.ts   # Endpoints de administración
    └── usuario.routes.ts       # Control de acceso RBAC
```

## 🚀 Características Avanzadas

### 🏢 Dashboard Ejecutivo Integral
- **Analytics de Negocio**: Métricas KPI en tiempo real con visualización avanzada
- **Reportes Ejecutivos**: Informes automáticos para management con insights accionables
- **Análisis Predictivo**: Forecasting basado en datos históricos y machine learning
- **Métricas de Performance**: Seguimiento de SLAs, conversión y eficiencia operacional

### 💰 Análisis de Rentabilidad Avanzado
- **ROI por Cliente**: Rentabilidad individual y por segmento demográfico
- **Cost per Acquisition**: Optimización de costos de adquisición por canal
- **Customer Lifetime Value**: Valor proyectado con modelos predictivos
- **Análisis de Margen**: Márgenes por producto, región y período temporal

### 🎯 Gestión Inteligente de Cargas de Trabajo
- **Auto-Assignment**: Asignación automática basada en heurísticas avanzadas
- **Load Balancing**: Distribución equilibrada con algoritmos de optimización
- **Performance Tracking**: Métricas de productividad por agente y equipo
- **Capacity Planning**: Planificación predictiva de recursos y escalabilidad

### 🚨 Sistema de Alertas Inteligentes
- **Risk Management**: Detección proactiva de riesgos operacionales y financieros
- **Compliance Monitoring**: Alertas automáticas de cumplimiento normativo
- **Performance Alerts**: Notificaciones de métricas críticas y umbrales
- **Smart Notifications**: Alertas contextuales con recomendaciones accionables

### 📊 Business Intelligence & Analytics
- **Data Mining**: Extracción de insights de datasets masivos con algoritmos ML
- **Segmentación Avanzada**: Clustering automático de clientes y productos
- **Trend Analysis**: Análisis de tendencias estacionales y patrones de comportamiento
- **Comparative Analytics**: Benchmarking automático y análisis de competitividad

### 🔄 Workflows Automatizados
- **Document Processing**: OCR inteligente y validación automática de documentos
- **Approval Chains**: Flujos de aprobación configurables con escalamiento automático
- **Status Management**: Gestión automática de estados con notificaciones
- **Integration APIs**: Conectores nativos con sistemas bancarios externos

### 🛡️ Seguridad Empresarial
- **Role-Based Access Control (RBAC)**: 5 niveles de autorización granular (ADMIN, SUPER, AUDITOR, OPERADOR, VIEWER)
- **JWT Security**: Tokens seguros con refresh automático y blacklisting
- **Audit Trails**: Trazabilidad completa con logs inmutables y análisis forense
- **Data Encryption**: Cifrado AES-256 en tránsito y en reposo con gestión de claves
- **Advanced Rate Limiting**: Protección multicapa contra ataques DDoS y brute force

### 📈 Monitoreo y Performance
- **Real-time Metrics**: Métricas en tiempo real con dashboards interactivos
- **Health Checks**: Monitoreo proactivo de servicios con auto-recovery
- **Performance Profiling**: Análisis detallado con métricas de latencia y throughput
- **Error Tracking**: Sistema completo de logging con alertas inteligentes

### 🔧 APIs RESTful Avanzadas
- **OpenAPI 3.0**: Documentación automática con Swagger UI y testing integrado
- **API Versioning**: Control granular de versiones con compatibilidad hacia atrás
- **Response Caching**: Caché inteligente con invalidación automática y warm-up
- **Request Validation**: Validación robusta con Zod schemas y sanitización

### 📋 Gestión de Documentos KYC
- **Multi-format Support**: Soporte nativo para PDF, imágenes, documentos escaneados
- **Automated Classification**: Clasificación automática por tipos de documento con IA
- **Compliance Validation**: Validación automática de requisitos KYC y regulatorios
- **Document Versioning**: Control de versiones con histórico completo y auditoría

## 🗄️ Modelo de Datos Detallado

### Entidades Principales

#### 👥 **cliente**
```sql
CREATE TABLE cliente (
  cliente_id INT PRIMARY KEY AUTO_INCREMENT,
  tipo_persona ENUM('fisica', 'moral') NOT NULL,
  rfc VARCHAR(13) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  telefono VARCHAR(15),
  -- Persona Física
  nombre VARCHAR(50),
  apellido_paterno VARCHAR(50),
  apellido_materno VARCHAR(50),
  fecha_nacimiento DATE,
  -- Persona Moral
  razon_social VARCHAR(100),
  fecha_constitucion DATE,
  -- Metadatos
  estatus ENUM('activo', 'inactivo', 'suspendido') DEFAULT 'activo',
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 💰 **ingreso_cliente**
```sql
CREATE TABLE ingreso_cliente (
  ingreso_id INT PRIMARY KEY AUTO_INCREMENT,
  cliente_id INT NOT NULL,
  ingreso_mensual DECIMAL(15,2),
  ingreso_anual DECIMAL(15,2),
  actividad_economica VARCHAR(100),
  sector_economico VARCHAR(50),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id)
);
```

#### 📄 **documento_tipo**
```sql
CREATE TABLE documento_tipo (
  documento_tipo_id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  aplica_persona_fisica BOOLEAN DEFAULT FALSE,
  aplica_persona_moral BOOLEAN DEFAULT FALSE,
  es_obligatorio BOOLEAN DEFAULT FALSE,
  vigencia_dias INT DEFAULT 365,
  formatos_permitidos JSON, -- ['pdf', 'jpg', 'png']
  tamano_maximo_mb INT DEFAULT 5
);
```

#### 📋 **solicitud**
```sql
CREATE TABLE solicitud (
  solicitud_id INT PRIMARY KEY AUTO_INCREMENT,
  folio VARCHAR(20) UNIQUE NOT NULL,
  cliente_id INT NOT NULL,
  estatus ENUM('iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada') DEFAULT 'iniciada',
  fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  observaciones TEXT,
  usuario_asignado_id INT,
  FOREIGN KEY (cliente_id) REFERENCES cliente(cliente_id)
);
```

### Relaciones y Constrains
- **1:N** - Cliente tiene múltiples documentos
- **1:N** - Cliente tiene múltiples solicitudes  
- **N:M** - Solicitud tiene múltiples productos
- **1:N** - Usuario maneja múltiples solicitudes

## 🚀 API Reference Completa

### 🔐 **Autenticación y Seguridad**

#### **POST** `/api/usuarios/login`
Autenticación JWT con validación de credenciales

**Request Body:**
```json
{
  "email": "admin@empresa.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "usuario_id": 1,
      "nombre": "Administrador",
      "email": "admin@empresa.com",
      "rol": "ADMIN",
      "permisos": ["create", "read", "update", "delete"]
    },
    "expiresIn": "24h"
  }
}
```

**Headers de Autenticación:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 👥 **Gestión de Clientes**

#### **GET** `/api/clientes`
Lista clientes con filtros avanzados y paginación

**Query Parameters:**
```http
GET /api/clientes?page=1&limit=10&search=juan&tipo_persona=fisica&estatus=activo&sortBy=fecha_registro&sortOrder=DESC
```

**Response (200):**
```json
{
  "success": true,
  "message": "Clientes obtenidos exitosamente",
  "data": {
    "clientes": [
      {
        "cliente_id": 1,
        "tipo_persona": "fisica",
        "rfc": "JUPA850101ABC",
        "email": "juan.perez@email.com",
        "nombre": "Juan",
        "apellido_paterno": "Pérez",
        "apellido_materno": "García",
        "telefono": "+52 55 1234 5678",
        "estatus": "activo",
        "fecha_registro": "2025-01-15T10:30:00.000Z",
        "completitud_documentos": 85.5,
        "solicitudes_activas": 2
      }
    ],
    "meta": {
      "total": 1247,
      "page": 1,
      "limit": 10,
      "pages": 125,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### **POST** `/api/clientes`
Crear nuevo cliente con validaciones de negocio

**Request Body (Persona Física):**
```json
{
  "tipo_persona": "fisica",
  "rfc": "JUPA850101ABC",
  "email": "juan.perez@email.com",
  "telefono": "+52 55 1234 5678",
  "nombre": "Juan",
  "apellido_paterno": "Pérez",
  "apellido_materno": "García",
  "fecha_nacimiento": "1985-01-01",
  "ingreso": {
    "ingreso_mensual": 25000.00,
    "ingreso_anual": 300000.00,
    "actividad_economica": "Empleado",
    "sector_economico": "Servicios"
  }
}
```

**Request Body (Persona Moral):**
```json
{
  "tipo_persona": "moral",
  "rfc": "EMP850101AB1",
  "email": "contacto@empresa.com.mx",
  "telefono": "+52 55 9876 5432",
  "razon_social": "Empresa de Servicios S.A. de C.V.",
  "fecha_constitucion": "1985-01-01",
  "ingreso": {
    "ingreso_anual": 5000000.00,
    "actividad_economica": "Servicios Profesionales",
    "sector_economico": "Servicios"
  }
}
```

#### **GET** `/api/clientes/:id`
Obtener cliente específico con información completa

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cliente_id": 1,
    "tipo_persona": "fisica",
    "rfc": "JUPA850101ABC",
    "email": "juan.perez@email.com",
    "nombre": "Juan",
    "apellido_paterno": "Pérez",
    "ingresos": [
      {
        "ingreso_mensual": 25000.00,
        "fecha_registro": "2025-01-15T10:30:00.000Z"
      }
    ],
    "documentos": [
      {
        "documento_id": 101,
        "tipo_documento": "INE",
        "estatus": "aprobado",
        "fecha_vencimiento": "2028-01-15",
        "url_acceso": "https://storage.googleapis.com/bucket/docs/..."
      }
    ],
    "solicitudes": [
      {
        "solicitud_id": 501,
        "folio": "SOL-2025-000501",
        "estatus": "en_revision",
        "productos": ["CS", "CC"]
      }
    ],
    "completitud": {
      "porcentaje": 85.5,
      "documentos_faltantes": 2,
      "documentos_vencidos": 0
    }
  }
}
```

---

### 📄 **Gestión de Documentos**

#### **POST** `/api/documentos/upload`
Subir documentos con validación automática

**Request (multipart/form-data):**
```http
Content-Type: multipart/form-data

cliente_id: 1
documento_tipo_id: 5
archivo: [archivo.pdf]
fecha_documento: 2025-01-15
observaciones: Documento actualizado
```

**Response (201):**
```json
{
  "success": true,
  "message": "Documento subido exitosamente",
  "data": {
    "documento_id": 101,
    "cliente_id": 1,
    "tipo_documento": "INE",
    "nombre_archivo": "INE_JUPA850101ABC_20250115.pdf",
    "tamano_bytes": 2048576,
    "url_acceso": "https://storage.googleapis.com/bucket/docs/INE_JUPA850101ABC_20250115.pdf",
    "fecha_vencimiento": "2028-01-15T00:00:00.000Z",
    "estatus": "pendiente",
    "metadata": {
      "formato": "pdf",
      "páginas": 2,
      "checksum": "sha256:abc123..."
    }
  }
}
```

#### **PATCH** `/api/documentos/:id/review`
Aprobar o rechazar documento (solo ADMIN+)

**Request Body:**
```json
{
  "accion": "aprobar", // "aprobar" | "rechazar"
  "observaciones": "Documento válido y legible",
  "fecha_vencimiento": "2028-01-15" // opcional para corrección
}
```

---

### 📋 **Gestión de Solicitudes**

#### **POST** `/api/solicitudes`
Crear nueva solicitud con productos

**Request Body:**
```json
{
  "cliente_id": 1,
  "productos": [
    {
      "producto": "CS", // Cuenta de ahorro
      "monto_solicitado": 0, // Para cuentas sin monto
      "plazo_meses": null,
      "observaciones": "Cuenta de ahorro básica"
    },
    {
      "producto": "FA", // Financiamiento automotriz
      "monto_solicitado": 350000.00,
      "plazo_meses": 48,
      "observaciones": "Financiamiento para vehículo nuevo"
    }
  ],
  "observaciones": "Cliente referido por sucursal"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Solicitud creada exitosamente",
  "data": {
    "solicitud_id": 501,
    "folio": "SOL-2025-000501",
    "cliente_id": 1,
    "estatus": "iniciada",
    "fecha_solicitud": "2025-07-21T15:30:00.000Z",
    "productos": [
      {
        "solicitud_producto_id": 1001,
        "producto": "CS",
        "monto_solicitado": 0,
        "estatus": "activo"
      },
      {
        "solicitud_producto_id": 1002,
        "producto": "FA",
        "monto_solicitado": 350000.00,
        "plazo_meses": 48,
        "estatus": "activo"
      }
    ],
    "completitud_documentos": {
      "porcentaje": 85.5,
      "documentos_requeridos": 8,
      "documentos_subidos": 6,
      "documentos_aprobados": 5
    }
  }
}
```

#### **PUT** `/api/solicitudes/:id/estatus`
Cambiar estatus de solicitud con validaciones de flujo

**Request Body:**
```json
{
  "nuevo_estatus": "en_revision", // iniciada -> en_revision -> aprobada/rechazada
  "observaciones": "Documentación completa, procediendo a revisión",
  "usuario_asignado_id": 5 // opcional
}
```

---

### 👤 **Administración de Usuarios**

#### **POST** `/api/usuarios`
Crear usuario del sistema (solo ADMIN+)

**Request Body:**
```json
{
  "nombre": "Ana García",
  "email": "ana.garcia@empresa.com",
  "password": "TempPassword123!",
  "rol": "OPERADOR", // SUPER | ADMIN | AUDITOR | OPERADOR
  "sucursal_id": 10,
  "telefono": "+52 55 8765 4321",
  "activo": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "usuario_id": 15,
    "nombre": "Ana García",
    "email": "ana.garcia@empresa.com",
    "rol": "OPERADOR",
    "permisos": ["read", "update"],
    "sucursal_id": 10,
    "activo": true,
    "fecha_registro": "2025-07-21T15:30:00.000Z",
    "requiere_cambio_password": true
  }
}
```

## 🔐 Sistema de Autenticación y Autorización

### Roles y Permisos Detallados

| **Rol** | **Permisos** | **Acceso** | **Descripción** |
|---------|-------------|-----------|-----------------|
| **SUPER** | `create`, `read`, `update`, `delete`, `admin` | Sistema completo + BI | Superadministrador con acceso total y capacidades administrativas avanzadas |
| **ADMIN** | `create`, `read`, `update`, `delete` | Operaciones completas + Analytics | Administrador con gestión de usuarios y acceso a dashboards ejecutivos |
| **AUDITOR** | `read`, `audit` | Solo lectura + Reportes | Auditor con acceso de consulta y reportes de compliance |
| **OPERADOR** | `read`, `update` | Operaciones básicas | Operador con modificaciones limitadas y métricas básicas |
| **VIEWER** | `read` | Solo consulta | Visualización básica sin modificaciones |

### Matriz de Permisos por Endpoint Administrativo

| **Endpoint Administrativo** | **SUPER** | **ADMIN** | **AUDITOR** | **OPERADOR** | **VIEWER** |
|------------------------------|-----------|-----------|-------------|--------------|------------|
| `GET /api/admin/dashboard-ejecutivo` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /api/admin/analisis-rentabilidad` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /api/admin/gestion-carga-trabajo` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `GET /api/admin/alertas-inteligentes` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `GET /api/admin/reporte-performance` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `POST /api/admin/asignar-inteligente` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `GET /api/admin/exportar-datos` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Matriz de Permisos Operacionales

| **Endpoint Operacional** | **SUPER** | **ADMIN** | **AUDITOR** | **OPERADOR** | **VIEWER** |
|---------------------------|-----------|-----------|-------------|--------------|------------|
| `POST /api/clientes` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `GET /api/clientes` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `PUT /api/clientes/:id` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `DELETE /api/clientes/:id` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `POST /api/usuarios` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `DELETE /api/usuarios/:id` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `PATCH /api/documentos/:id/review` | ✅ | ✅ | ❌ | ✅ | ❌ |

### Configuración JWT

```typescript
// Configuración de tokens
{
  "algorithm": "HS256",
  "expiresIn": "24h",
  "issuer": "onboarding-api",
  "audience": "onboarding-app"
}
```

---

## ⚙️ Variables de Entorno Completas

### Archivo `.env` requerido:

```bash
# ===========================================
# CONFIGURACIÓN DE BASE DE DATOS
# ===========================================
DB_HOST=localhost
DB_USER=onboarding_user
DB_PASS=secure_password_123
DB_NAME=onboarding_digital
DB_PORT=3306

# Pool de conexiones
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# ===========================================
# CONFIGURACIÓN JWT Y SEGURIDAD
# ===========================================
JWT_SECRET=your-super-secret-jwt-key-256-bits-minimum
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# GOOGLE CLOUD STORAGE
# ===========================================
GOOGLE_APPLICATION_CREDENTIALS=./keyfiles/keyfile.json
GOOGLE_BUCKET_NAME=onboarding-documentos-prod
GOOGLE_PROJECT_ID=tu-proyecto-gcp

# ===========================================
# CONFIGURACIÓN DEL SERVIDOR
# ===========================================
PORT=3001
NODE_ENV=production
API_VERSION=v1
BASE_URL=https://api.onboarding.empresa.com

# Timeouts
REQUEST_TIMEOUT=30000
SERVER_TIMEOUT=30000

# ===========================================
# CONFIGURACIÓN DE ARCHIVOS
# ===========================================
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png
UPLOAD_PATH=./uploads
TEMP_PATH=./temp

# ===========================================
# REDIS (CACHÉ)
# ===========================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
REDIS_DB=0
CACHE_TTL=600

# ===========================================
# LOGGING Y MONITOREO
# ===========================================
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# Métricas
ENABLE_METRICS=true
METRICS_PORT=9090

# ===========================================
# NOTIFICACIONES (FUTURO)
# ===========================================
SMTP_HOST=smtp.empresa.com
SMTP_PORT=587
SMTP_USER=noreply@empresa.com
SMTP_PASS=smtp_password
```

---

## � Funcionalidades Administrativas Implementadas

### 🏢 Cliente - Módulo Administrativo
- **Dashboard de Clientes**: Métricas de actividad, distribución por tipo persona, análisis de crecimiento
- **Segmentación Inteligente**: Clustering automático por ingresos, actividad económica y comportamiento
- **Análisis de Comportamiento**: Patrones de uso, frecuencia de interacción y lifecycle del cliente
- **Gestión de Riesgos**: Evaluación automática de perfil de riesgo y alertas de compliance
- **Reportes de Retención**: Análisis de churn, lifetime value y oportunidades de cross-selling

### 📄 Documento - Módulo KYC Avanzado
- **Centro de Control KYC**: Dashboard centralizado con métricas de documentación y compliance
- **Análisis de Calidad**: Evaluación automática de calidad de documentos con scoring IA
- **Workflow de Aprobación**: Gestión avanzada de estados con escalamiento automático
- **Auditoría de Documentos**: Trazabilidad completa con logging inmutable y forense digital
- **Alertas de Vencimiento**: Sistema proactivo de renovación de documentos críticos

### 💼 Solicitud - Módulo de Productos Financieros
- **Dashboard Ejecutivo**: Métricas en tiempo real de conversión, aprobación y rentabilidad
- **Análisis de Rentabilidad**: ROI por producto, margen por cliente y proyecciones financieras
- **Gestión de Carga de Trabajo**: Distribución inteligente, balanceador automático y optimización de equipos
- **Sistema de Alertas**: Detección de cuellos de botella, alertas de SLA y notificaciones críticas
- **Reportes Comparativos**: Análisis período vs período con KPIs automáticos y benchmarking
- **Asignación Inteligente**: Algoritmos ML para distribución óptima de solicitudes
- **Exportación Avanzada**: Extracción de datos para BI en formatos múltiples (JSON/CSV/Excel)

### 🔧 Capacidades Técnicas Transversales
- **Caché Inteligente**: Redis con TTL diferenciado (5min-1hora) según criticidad de datos
- **Consultas Optimizadas**: CTEs, subconsultas complejas y agregaciones para performance
- **Logging Estructurado**: Winston con formato JSON para análisis automático y alertas
- **Validación Robusta**: Zod schemas con sanitización y validación en tiempo real
- **Rate Limiting Avanzado**: Protección multicapa con límites diferenciados por rol

---

## �🚀 Instalación y Configuración Detallada

### Prerrequisitos del Sistema

```bash
# Versiones mínimas requeridas
Node.js >= 18.0.0
MySQL >= 8.0.0
Redis >= 6.0.0 (opcional pero recomendado)
Git >= 2.25.0
```

### 1. **Clonación e Instalación**

```bash
# Clonar repositorio
git clone https://github.com/tu-empresa/onboarding-backend.git
cd onboarding-backend

# Instalar dependencias
npm install

# Instalar herramientas globales
npm install -g typescript ts-node nodemon
```

### 2. **Configuración de Base de Datos**

```bash
# Crear base de datos MySQL
mysql -u root -p

CREATE DATABASE onboarding_digital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'onboarding_user'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON onboarding_digital.* TO 'onboarding_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Ejecutar scripts de inicialización
mysql -u onboarding_user -p onboarding_digital < scripts/01_create_tables.sql
mysql -u onboarding_user -p onboarding_digital < scripts/02_seed_data.sql
mysql -u onboarding_user -p onboarding_digital < scripts/03_documento_tipos.sql
```

### 3. **Configuración de Google Cloud Storage**

```bash
# Crear keyfile para GCS
# 1. Ir a Google Cloud Console
# 2. Crear Service Account
# 3. Generar clave JSON
# 4. Guardar como ./keyfiles/keyfile.json

# Crear bucket
gsutil mb gs://onboarding-documentos-prod
gsutil iam ch serviceAccount:tu-service-account@proyecto.iam.gserviceaccount.com:objectAdmin gs://onboarding-documentos-prod
```

### 4. **Configuración de Entorno**

```bash
# Copiar template de variables
cp .env.example .env

# Editar variables de entorno
nano .env

# Validar configuración
npm run config:validate
```

### 5. **Inicialización y Testing**

```bash
# Desarrollo
npm run dev

# Testing
npm run test:setup  # Configurar DB de testing
npm run test       # Tests completos
npm run test:coverage  # Coverage report

# Producción
npm run build
npm run start:prod
```

---

## 📊 Scripts NPM Disponibles

```json
{
  "scripts": {
    // Desarrollo
    "dev": "cross-env NODE_OPTIONS=\"--max-old-space-size=2048 --expose-gc\" nodemon src/server.ts",
    "dev:debug": "cross-env NODE_OPTIONS=\"--max-old-space-size=2048 --expose-gc --inspect\" nodemon src/server.ts",
    
    // Construcción
    "build": "tsc",
    "build:watch": "tsc --watch",
    
    // Producción
    "start": "node dist/server.js",
    "start:prod": "cross-env NODE_ENV=production node dist/server.js",
    
    // Testing
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:security": "jest test/integration/usuarios*.test.ts --verbose",
    
    // Utilidades
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write src/**/*.ts",
    
    // Base de datos
    "db:migrate": "npx sequelize-cli db:migrate",
    "db:seed": "npx sequelize-cli db:seed:all",
    "db:reset": "npm run db:migrate:undo:all && npm run db:migrate && npm run db:seed",
    
    // Validaciones
    "config:validate": "node scripts/validate-config.js",
    "health:check": "curl http://localhost:3001/health"
  }
}
```

## 🔧 Validaciones de Negocio Específicas

### 👥 **Validaciones de Cliente**

#### **RFC (Registro Federal de Contribuyentes)**
```typescript
// Persona Física: 13 caracteres (JUPA850101ABC)
// Persona Moral: 12 caracteres (EMP850101AB1)

const rfcPatterns = {
  fisica: /^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/,
  moral: /^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/
};

// Validaciones específicas:
// - Formato válido según SAT
// - No debe existir en la base de datos
// - Homoclave válida
// - Fecha de nacimiento/constitución coherente
```

#### **Datos Obligatorios por Tipo de Persona**

**Persona Física (PF/PF_AE):**
```json
{
  "campos_obligatorios": [
    "rfc", "email", "nombre", "apellido_paterno", 
    "fecha_nacimiento", "telefono"
  ],
  "campos_opcionales": [
    "apellido_materno", "segundo_nombre"
  ],
  "validaciones_especiales": {
    "edad_minima": 18,
    "edad_maxima": 99,
    "email_unico": true,
    "telefono_formato": "+52 XX XXXX XXXX"
  }
}
```

**Persona Moral (PM):**
```json
{
  "campos_obligatorios": [
    "rfc", "email", "razon_social", 
    "fecha_constitucion", "telefono"
  ],
  "validaciones_especiales": {
    "antiguedad_minima": "6 meses",
    "razon_social_minimo": 5,
    "razon_social_maximo": 100
  }
}
```

### 📄 **Validaciones de Documentos**

#### **Tipos de Documento por Persona**

```sql
-- Documentos para Persona Física
INSERT INTO documento_tipo VALUES 
(1, 'INE/IFE', 'Identificación oficial', true, false, true, 2555, '["pdf","jpg","png"]', 5),
(2, 'Comprobante de Ingresos', 'Últimos 3 recibos de nómina', true, false, true, 90, '["pdf"]', 10),
(3, 'Comprobante de Domicilio', 'No mayor a 3 meses', true, false, true, 90, '["pdf","jpg"]', 5),
(4, 'CURP', 'Clave Única de Registro de Población', true, false, true, 3650, '["pdf"]', 2);

-- Documentos para Persona Moral
INSERT INTO documento_tipo VALUES 
(10, 'Acta Constitutiva', 'Acta constitutiva de la empresa', false, true, true, 3650, '["pdf"]', 20),
(11, 'RFC de la Empresa', 'Cédula de identificación fiscal', false, true, true, 365, '["pdf"]', 5),
(12, 'Comprobante de Domicilio Fiscal', 'No mayor a 3 meses', false, true, true, 90, '["pdf","jpg"]', 5),
(13, 'Estados Financieros', 'Últimos 2 años auditados', false, true, true, 365, '["pdf"]', 50);
```

#### **Validaciones de Archivo**

```typescript
interface FileValidationRules {
  maxSize: number;           // 5MB = 5242880 bytes
  allowedFormats: string[];  // ['pdf', 'jpg', 'jpeg', 'png']
  maxPages: number;          // PDF: máximo 10 páginas
  minResolution: {           // Imágenes: mínimo 300 DPI
    width: 1200,
    height: 800
  };
  virusCheck: boolean;       // Validación antivirus
  contentValidation: boolean; // Validación de contenido (OCR)
}

// Validaciones automáticas:
// ✅ Tamaño de archivo
// ✅ Formato/extensión
// ✅ Integridad del archivo
// ✅ Escaneo de virus
// ✅ Extracción de metadata
// ✅ Generación de checksum
```

### 📋 **Validaciones de Solicitudes**

#### **Productos Financieros y Sus Reglas**

```typescript
const productValidations = {
  CS: { // Cuenta de Ahorro
    monto_minimo: 0,
    monto_maximo: null,
    plazo_meses: null,
    documentos_requeridos: ['INE', 'Comprobante_Domicilio', 'Comprobante_Ingresos'],
    edad_minima: 18,
    aplicaPersona: ['fisica', 'moral']
  },
  
  CC: { // Cuenta Corriente
    monto_minimo: 10000,
    monto_maximo: null,
    plazo_meses: null,
    documentos_requeridos: ['INE', 'Comprobante_Domicilio', 'Comprobante_Ingresos', 'Referencia_Comercial'],
    ingreso_minimo: 15000,
    aplicaPersona: ['fisica', 'moral']
  },
  
  FA: { // Financiamiento Automotriz
    monto_minimo: 50000,
    monto_maximo: 2000000,
    plazo_minimo: 12,
    plazo_maximo: 84,
    enganche_minimo: 0.20, // 20%
    documentos_requeridos: ['INE', 'Comprobante_Ingresos', 'Autorizacion_Buro', 'Cotizacion_Vehiculo'],
    ingreso_minimo: 8000,
    aplicaPersona: ['fisica']
  },
  
  AR: { // Arrendamiento
    monto_minimo: 100000,
    monto_maximo: 5000000,
    plazo_minimo: 24,
    plazo_maximo: 60,
    documentos_requeridos: ['Estados_Financieros', 'Acta_Constitutiva', 'Autorizacion_Buro'],
    aplicaPersona: ['moral']
  }
};
```

#### **Flujo de Estados de Solicitud**

```mermaid
graph TD
    A[iniciada] --> B[en_revision]
    B --> C[aprobada]
    B --> D[rechazada]
    A --> E[cancelada]
    B --> E[cancelada]
    
    style A fill:#e1f5fe
    style B fill:#fff3e0
    style C fill:#e8f5e8
    style D fill:#ffebee
    style E fill:#f3e5f5
```

**Reglas de Transición:**
- `iniciada` → `en_revision`: Requiere documentación completa (≥80%)
- `en_revision` → `aprobada`: Solo ADMIN+ puede aprobar
- `en_revision` → `rechazada`: Requiere observaciones obligatorias
- Cualquier estado → `cancelada`: Cliente o ADMIN+ puede cancelar
- **No se permite regresión** de estados (ej: aprobada → en_revision)

---

## 📈 Monitoreo y Observabilidad

### 🔍 **Health Checks Avanzados**

#### **GET** `/health`
Health check básico del sistema

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-21T15:30:00.000Z",
  "version": "1.2.3",
  "uptime": 86400,
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45,
      "details": {
        "connection": "active",
        "poolSize": 8,
        "activeConnections": 3
      }
    },
    "cache": {
      "status": "healthy", 
      "responseTime": 12,
      "details": {
        "type": "redis",
        "memory": "245MB",
        "keyCount": 1547
      }
    },
    "memory": {
      "status": "degraded",
      "details": {
        "used": "1.2GB",
        "total": "2GB", 
        "percentage": 60.5,
        "thresholds": {
          "warning": "95%",
          "critical": "98%"
        }
      }
    },
    "storage": {
      "status": "healthy",
      "details": {
        "provider": "Google Cloud Storage",
        "bucket": "onboarding-documentos-prod",
        "connectivity": "ok"
      }
    }
  }
}
```

### 📊 **Métricas de Performance**

#### **GET** `/metrics`
Métricas en formato Prometheus

```prometheus
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/clientes",status="200"} 1547

# HELP http_request_duration_seconds Duration of HTTP requests
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="POST",route="/api/documentos/upload",le="0.1"} 245
http_request_duration_seconds_bucket{method="POST",route="/api/documentos/upload",le="0.5"} 890

# HELP database_connections_active Active database connections
# TYPE database_connections_active gauge
database_connections_active 8

# HELP cache_hit_ratio Cache hit ratio
# TYPE cache_hit_ratio gauge
cache_hit_ratio 0.847
```

### 🚨 **Sistema de Alertas**

```typescript
// Configuración de alertas automáticas
const alertThresholds = {
  responseTime: {
    warning: 1000,    // 1 segundo
    critical: 5000    // 5 segundos
  },
  errorRate: {
    warning: 0.05,    // 5%
    critical: 0.10    // 10%
  },
  memoryUsage: {
    warning: 0.80,    // 80%
    critical: 0.95    // 95%
  },
  diskSpace: {
    warning: 0.85,    // 85%
    critical: 0.95    // 95%
  }
};
```

---

## 🛡️ Seguridad y Compliance

### 🔒 **Medidas de Seguridad Implementadas**

#### **Rate Limiting Diferenciado**
```typescript
const rateLimits = {
  // Operaciones de escritura (POST, PUT, DELETE)
  write: {
    windowMs: 15 * 60 * 1000,  // 15 minutos
    max: 100                   // 100 operaciones
  },
  
  // Operaciones de lectura (GET)
  read: {
    windowMs: 15 * 60 * 1000,  // 15 minutos  
    max: 1000                  // 1000 consultas
  },
  
  // Autenticación
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutos
    max: 10,                   // 10 intentos
    skipSuccessfulRequests: true
  },
  
  // Uploads de archivos
  upload: {
    windowMs: 60 * 60 * 1000,  // 1 hora
    max: 50                    // 50 uploads
  }
};
```

#### **Validaciones de Seguridad**
- ✅ **Helmet.js**: Headers de seguridad automáticos
- ✅ **CORS**: Configuración estricta de origen
- ✅ **Input Validation**: Sanitización con Zod
- ✅ **SQL Injection**: Prevención con Sequelize ORM
- ✅ **XSS Protection**: Escape de contenido automático
- ✅ **File Upload**: Validación de tipo MIME y contenido
- ✅ **Encryption**: Passwords con bcrypt (12 rounds)
- ✅ **JWT Security**: Tokens firmados con algoritmo HS256

### 📋 **Auditoría y Logging**

```typescript
// Estructura de logs de auditoría
interface AuditLog {
  timestamp: string;
  userId: number;
  userEmail: string;
  action: string;           // CREATE, READ, UPDATE, DELETE
  resource: string;         // cliente, documento, solicitud
  resourceId: string;
  oldValues?: object;       // Estado anterior (UPDATE/DELETE)
  newValues?: object;       // Estado nuevo (CREATE/UPDATE)
  ipAddress: string;
  userAgent: string;
  requestId: string;
  success: boolean;
  errorCode?: string;
}
```

---

## 🚀 Despliegue en Producción

### 🐳 **Containerización con Docker**

#### **Dockerfile**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S onboarding -u 1001

WORKDIR /app

COPY --from=builder --chown=onboarding:nodejs /app/dist ./dist
COPY --from=builder --chown=onboarding:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=onboarding:nodejs /app/package.json ./package.json

USER onboarding

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
```

#### **docker-compose.yml**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: onboarding_digital
      MYSQL_USER: onboarding_user
      MYSQL_PASSWORD: user_password
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts:/docker-entrypoint-initdb.d
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass redis_password
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
```

### ☁️ **Despliegue en Cloud**

#### **Google Cloud Platform**
```bash
# Cloud Run
gcloud run deploy onboarding-api \
  --image gcr.io/tu-proyecto/onboarding-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production

# Cloud SQL
gcloud sql instances create onboarding-mysql \
  --database-version=MYSQL_8_0 \
  --tier=db-n1-standard-2 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=100GB
```

### 🔄 **CI/CD Pipeline**

#### **GitHub Actions (.github/workflows/deploy.yml)**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run test
      - run: npm run lint

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: google-github-actions/setup-gcloud@v0
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Build and Push Docker Image
        run: |
          docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/onboarding-backend .
          docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/onboarding-backend
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy onboarding-api \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/onboarding-backend \
            --platform managed \
            --region us-central1
```

---

## 🔧 APIs Administrativas Implementadas

### 📊 Endpoints de Dashboard Ejecutivo

#### **GET** `/api/admin/dashboard-ejecutivo`
Dashboard principal con KPIs en tiempo real

**Authorization:** `SUPER`, `ADMIN`, `AUDITOR`

**Query Parameters:**
```http
GET /api/admin/dashboard-ejecutivo?periodo=30d&sucursal_id=10&incluir_tendencias=true
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resumen_general": {
      "total_clientes": 15847,
      "clientes_activos": 14521,
      "solicitudes_pendientes": 247,
      "tasa_conversion": 73.5,
      "valor_pipeline": 125000000.00
    },
    "metricas_performance": {
      "tiempo_promedio_aprobacion": "4.2 días",
      "documentos_procesados_hoy": 156,
      "satisfaccion_cliente": 4.7,
      "sla_compliance": 94.2
    },
    "tendencias": {
      "clientes_nuevos_vs_anterior": "+12.5%",
      "solicitudes_aprobadas_vs_anterior": "+8.3%",
      "tiempo_procesamiento_vs_anterior": "-15.2%"
    },
    "alertas_criticas": [
      {
        "tipo": "sla_breach",
        "mensaje": "3 solicitudes exceden SLA de 72 horas",
        "severidad": "high",
        "accion_requerida": "Reasignar carga de trabajo"
      }
    ]
  }
}
```

### 💰 Análisis de Rentabilidad

#### **GET** `/api/admin/analisis-rentabilidad`
Análisis detallado de rentabilidad por productos y segmentos

**Authorization:** `SUPER`, `ADMIN`, `AUDITOR`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rentabilidad_por_producto": [
      {
        "producto": "CS",
        "ingresos_totales": 2500000.00,
        "costos_operativos": 850000.00,
        "margen_bruto": 66.0,
        "roi": 194.1,
        "clientes_activos": 8547
      },
      {
        "producto": "FA",
        "ingresos_totales": 15000000.00,
        "costos_operativos": 4500000.00,
        "margen_bruto": 70.0,
        "roi": 233.3,
        "clientes_activos": 1247
      }
    ],
    "segmentacion_clientes": [
      {
        "segmento": "Premium (>$100K ingresos)",
        "cantidad_clientes": 2547,
        "ingreso_promedio_cliente": 125000.00,
        "valor_lifetime": 450000.00,
        "costo_adquisicion": 2500.00,
        "rentabilidad_neta": 85.2
      }
    ],
    "proyecciones": {
      "ingresos_proyectados_12m": 58000000.00,
      "crecimiento_esperado": 23.5,
      "nuevos_clientes_meta": 5000
    }
  }
}
```

### 👥 Gestión de Carga de Trabajo

#### **GET** `/api/admin/gestion-carga-trabajo`
Dashboard de distribución y optimización de trabajo

**Authorization:** `SUPER`, `ADMIN`, `OPERADOR`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "distribucion_actual": [
      {
        "usuario_id": 15,
        "nombre": "Ana García",
        "solicitudes_asignadas": 12,
        "capacidad_maxima": 15,
        "utilizacion": 80.0,
        "tiempo_promedio_proceso": "3.2 días",
        "eficiencia": 92.5
      }
    ],
    "recomendaciones": [
      {
        "tipo": "reasignacion",
        "descripcion": "Reasignar 3 solicitudes de Usuario #12 a Usuario #15",
        "impacto_estimado": "Reducir tiempo promedio en 18%",
        "prioridad": "alta"
      }
    ],
    "metricas_equipo": {
      "productividad_promedio": 87.3,
      "solicitudes_completadas_hoy": 47,
      "tiempo_promedio_respuesta": "2.1 horas",
      "satisfaccion_interna": 4.2
    }
  }
}
```

### 🚨 Sistema de Alertas Inteligentes

#### **GET** `/api/admin/alertas-inteligentes`
Sistema proactivo de detección de problemas

**Authorization:** `SUPER`, `ADMIN`, `AUDITOR`, `OPERADOR`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alertas_activas": [
      {
        "id": "ALT-2025-001247",
        "tipo": "performance",
        "severidad": "high",
        "titulo": "Degradación en tiempo de respuesta",
        "descripcion": "API response time >2s en los últimos 15 minutos",
        "timestamp": "2025-01-15T14:30:00.000Z",
        "modulo_afectado": "documento_upload",
        "acciones_sugeridas": [
          "Verificar conectividad con Google Cloud Storage",
          "Revisar logs de aplicación",
          "Considerar reinicio de servicio"
        ],
        "usuarios_notificados": ["admin@empresa.com"],
        "estado": "activa"
      }
    ],
    "alertas_predictivas": [
      {
        "tipo": "capacity_planning",
        "prediccion": "Capacidad de almacenamiento se agotará en 45 días",
        "confianza": 89.5,
        "accion_recomendada": "Aumentar storage en Google Cloud Storage",
        "fecha_estimada": "2025-03-01"
      }
    ],
    "resumen_24h": {
      "total_alertas": 23,
      "resueltas_automaticamente": 18,
      "requieren_atencion": 3,
      "falsos_positivos": 2
    }
  }
}
```

### 📈 Reportes de Performance Comparativo

#### **GET** `/api/admin/reporte-performance`
Análisis comparativo de períodos con KPIs automáticos

**Authorization:** `SUPER`, `ADMIN`, `AUDITOR`

**Query Parameters:**
```http
GET /api/admin/reporte-performance?periodo_actual=2025-01&periodo_comparacion=2024-12&granularidad=semanal
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "comparacion_periodos": {
      "periodo_actual": "2025-01",
      "periodo_anterior": "2024-12",
      "metricas": {
        "solicitudes_procesadas": {
          "actual": 1247,
          "anterior": 1089,
          "variacion": "+14.5%",
          "tendencia": "positiva"
        },
        "tiempo_promedio_aprobacion": {
          "actual": "4.2 días",
          "anterior": "5.1 días",
          "variacion": "-17.6%",
          "tendencia": "positiva"
        },
        "tasa_aprobacion": {
          "actual": "87.3%",
          "anterior": "82.1%",
          "variacion": "+6.3%",
          "tendencia": "positiva"
        }
      }
    },
    "analisis_semanal": [
      {
        "semana": "2025-W03",
        "solicitudes": 342,
        "aprobaciones": 298,
        "rechazos": 31,
        "pendientes": 13,
        "eficiencia": 89.2
      }
    ],
    "benchmarking": {
      "posicion_industria": "Top 15%",
      "metricas_vs_promedio": {
        "tiempo_procesamiento": "23% mejor que promedio",
        "tasa_aprobacion": "12% superior",
        "satisfaccion_cliente": "18% mejor"
      }
    }
  }
}
```

### 🤖 Asignación Inteligente

#### **POST** `/api/admin/asignar-inteligente`
Algoritmo de asignación automática optimizada

**Authorization:** `SUPER`, `ADMIN`, `OPERADOR`

**Request Body:**
```json
{
  "solicitud_ids": [1247, 1248, 1249],
  "criterios": {
    "balancear_carga": true,
    "especialidad_producto": true,
    "experiencia_usuario": true,
    "ubicacion_geografica": false
  },
  "forzar_reasignacion": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Asignación inteligente completada",
  "data": {
    "asignaciones_realizadas": [
      {
        "solicitud_id": 1247,
        "usuario_anterior": null,
        "usuario_asignado": {
          "usuario_id": 15,
          "nombre": "Ana García",
          "especialidad": ["CS", "CC"],
          "carga_actual": 12,
          "eficiencia_historica": 92.5
        },
        "razon_asignacion": "Especialista en producto CS con menor carga de trabajo",
        "tiempo_estimado": "3.2 días"
      }
    ],
    "optimizacion_lograda": {
      "reduccion_tiempo_promedio": "15%",
      "mejora_distribucion": "23%",
      "incremento_eficiencia": "8%"
    },
    "alertas": []
  }
}
```

### 📤 Exportación Avanzada para BI

#### **GET** `/api/admin/exportar-datos`
Extracción de datos para herramientas de Business Intelligence

**Authorization:** `SUPER`, `ADMIN`, `AUDITOR`

**Query Parameters:**
```http
GET /api/admin/exportar-datos?modulos=cliente,solicitud&formato=json&fecha_inicio=2025-01-01&fecha_fin=2025-01-31&incluir_relaciones=true
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "fecha_exportacion": "2025-01-15T16:00:00.000Z",
      "periodo": "2025-01-01 a 2025-01-31",
      "total_registros": 15847,
      "formato": "json",
      "version_schema": "1.2.0"
    },
    "clientes": [
      {
        "cliente_id": 1,
        "tipo_persona": "fisica",
        "rfc": "***ANONIMIZADO***",
        "segmento": "premium",
        "fecha_registro": "2025-01-03",
        "valor_cliente": 125000.00,
        "productos_activos": ["CS", "FA"],
        "score_crediticio": 750,
        "ultima_actividad": "2025-01-14"
      }
    ],
    "solicitudes": [
      {
        "solicitud_id": 1247,
        "folio": "SOL-2025-001247",
        "cliente_id": 1,
        "productos": ["CS"],
        "estatus": "aprobada",
        "fecha_solicitud": "2025-01-10",
        "fecha_aprobacion": "2025-01-13",
        "tiempo_procesamiento_dias": 3,
        "usuario_procesador": 15,
        "valor_solicitado": 0
      }
    ],
    "agregaciones": {
      "total_clientes_periodo": 1247,
      "solicitudes_aprobadas": 1089,
      "ingresos_estimados": 2500000.00,
      "productos_mas_demandados": ["CS", "FA", "CC"]
    }
  }
}
```

---

## 🔗 Enlaces y Recursos

### 📚 **Documentación Técnica**
- **API Reference**: `http://localhost:3001/docs` (Swagger UI)
- **Postman Collection**: `./docs/OnboardingDigital.postman_collection.json`
- **Database Schema**: `./docs/database_schema.sql`
- **Architecture Diagrams**: `./docs/architecture/`

### 🛠️ **Herramientas de Desarrollo**
- **VS Code Extensions**: REST Client, Thunder Client
- **Database GUI**: MySQL Workbench, phpMyAdmin
- **API Testing**: Postman, Insomnia
- **Monitoring**: Grafana, Prometheus

### 🎯 **Próximas Funcionalidades**
- [ ] **Integración con Bureau de Crédito**
- [ ] **OCR para extracción automática de datos**
- [ ] **Firmas electrónicas avanzadas**
- [ ] **Chat en tiempo real con soporte**
- [ ] **Análisis predictivo con ML**
- [ ] **Integración con sistemas bancarios core**

---

## 📄 Licencia y Contacto

**Proyecto:** OnboardingDigital Backend API  
**Versión:** 1.2.3  
**Autor:** Equipo de Desarrollo Financiero  
**Licencia:** Propietaria - Uso interno exclusivo  

**Contacto Técnico:**
- **Email:** dev-team@empresa.com
- **Slack:** #onboarding-dev
- **Documentación:** https://docs.empresa.com/onboarding-api

---

**🎉 ¡API lista para producción con capacidades administrativas completas!**

> Esta documentación está actualizada con todas las funcionalidades administrativas implementadas en los módulos Cliente, Documento y Solicitud, incluyendo dashboards ejecutivos, análisis de rentabilidad, gestión inteligente de cargas de trabajo, sistema de alertas, reportes comparativos, asignación automática y exportación avanzada para Business Intelligence.

# Cloud SQL
gcloud sql instances create onboarding-mysql \
  --database-version MYSQL_8_0 \
  --tier db-n1-standard-2 \
  --region us-central1

# Memorystore (Redis)
gcloud redis instances create onboarding-cache \
  --size 1 \
  --region us-central1 \
  --redis-version redis_6_x
```

---

## 📞 Soporte y Contacto

### 🔧 **Resolución de Problemas Comunes**

| **Problema** | **Causa** | **Solución** |
|--------------|-----------|--------------|
| Error de conexión a BD | Credenciales incorrectas | Verificar variables en `.env` |
| Rate limit exceeded | Demasiadas requests | Implementar backoff exponencial |
| File upload fails | Archivo muy grande | Verificar `MAX_FILE_SIZE` |
| JWT token invalid | Token expirado | Renovar token con refresh |
| Memory warnings | Uso alto de memoria | Ajustar `NODE_OPTIONS` |

### 📚 **Documentación Adicional**

- **API Postman Collection**: `./docs/OnboardingAPI.postman_collection.json`
- **Database Schema**: `./docs/database-schema.sql`
- **Security Tests**: `./docs/SECURITY_TESTS.md`
- **Performance Guide**: `./docs/PERFORMANCE_OPTIMIZATION.md`

### 👥 **Equipo de Desarrollo**

- **Tech Lead**: [Nombre] - tech.lead@empresa.com
- **Backend Lead**: [Nombre] - backend.lead@empresa.com  
- **DevOps**: [Nombre] - devops@empresa.com
- **QA Lead**: [Nombre] - qa.lead@empresa.com

### 🐛 **Reporte de Issues**

Para reportar bugs o solicitar features:

1. **GitHub Issues**: [Repository Issues](https://github.com/tu-empresa/onboarding-backend/issues)
2. **Slack**: #onboarding-dev
3. **Email**: support@empresa.com

---

## 📄 **Licencia y Términos**

Este software es propiedad de **[Tu Empresa]** y está protegido por derechos de autor. 

**Confidencial y Propietario** - No distribuir sin autorización.

---

**Última actualización**: 21 de julio de 2025  
**Versión de la API**: v1.2.3  
**Documentación**: v2.0.0
