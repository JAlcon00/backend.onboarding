# 📄 MÓDULO DOCUMENTO - DOCUMENTACIÓN COMPLETA

## 🎯 Descripción General
El módulo Documento es el sistema de gestión documental del onboarding digital, diseñado para manejar la carga, validación, revisión y administración de documentos requeridos para el proceso KYC (Know Your Customer). Incluye funcionalidades administrativas avanzadas, análisis de completitud y herramientas de gestión masiva.

## 🏗️ Arquitectura del Módulo

### Archivos del Módulo
```
src/modules/documento/
├── documento.model.ts          # Modelo Sequelize principal
├── documentoTipo.model.ts      # Modelo para tipos de documento
├── documento.schema.ts         # Validaciones Zod
├── documento.controller.ts     # Controladores HTTP
├── documento.service.ts        # Lógica de negocio
├── documento.routes.ts         # Definición de rutas
└── DOCUMENTO_DOCS.md          # Esta documentación
```

## 📊 Modelos de Datos

### Documento (Tabla Principal)
- **documento_id**: ID único autoincrementable
- **cliente_id**: Referencia al cliente propietario
- **documento_tipo_id**: Referencia al tipo de documento
- **nombre**: Nombre del archivo original
- **url**: URL del documento en storage
- **estatus**: 'pendiente' | 'aceptado' | 'rechazado' | 'vencido'
- **fecha_documento**: Fecha de emisión del documento
- **fecha_subida**: Timestamp de carga
- **fecha_expiracion**: Fecha de vencimiento (calculada)
- **comentario_revisor**: Observaciones del revisor
- **Metadata**: created_at, updated_at

### DocumentoTipo (Catálogo de Tipos)
- **documento_tipo_id**: ID único
- **nombre**: Nombre del tipo (ej: "INE", "Comprobante de Domicilio")
- **descripcion**: Descripción detallada
- **aplica_pf**: Si aplica a Personas Físicas
- **aplica_pfae**: Si aplica a PF con Actividad Empresarial
- **aplica_pm**: Si aplica a Personas Morales
- **vigencia_dias**: Días de validez del documento
- **opcional**: Si es opcional o requerido
- **formatos_permitidos**: Array de formatos (pdf, jpg, png)
- **tamano_maximo_mb**: Tamaño máximo permitido

## 🔒 Validaciones Implementadas

### Validaciones de Esquema (Zod)
1. **Formatos permitidos**: Solo archivos PDF, JPG, PNG, JPEG
2. **Tamaño máximo**: Configurable por tipo de documento
3. **Fechas válidas**: Fecha de documento no futura
4. **Campos requeridos**: cliente_id, documento_tipo_id, archivo

### Validaciones de Modelo (Sequelize)
- Integridad referencial con Cliente y DocumentoTipo
- Estados válidos del documento
- Fechas coherentes

### Validaciones de Negocio (Servicio)
- Tipo de documento aplicable al tipo de persona
- Documentos no duplicados por cliente/tipo
- Validación de vigencia automática

## 🚀 Endpoints de la API

### Gestión Básica de Documentos
```
POST   /api/documentos/                    # Crear documento
GET    /api/documentos/                    # Listar documentos (con filtros)
GET    /api/documentos/:id                 # Obtener documento por ID
PUT    /api/documentos/:id                 # Actualizar documento
DELETE /api/documentos/:id                 # Eliminar documento
PATCH  /api/documentos/:id/review          # Revisar documento (aprobar/rechazar)
```

### Upload y Gestión de Archivos
```
POST   /api/documentos/upload              # Subir archivo
POST   /api/documentos/subir               # Subir documento completo
POST   /api/documentos/:id/regenerar-url   # Regenerar URL de acceso
```

### Consultas Especializadas
```
GET    /api/documentos/tipos               # Obtener tipos de documento
GET    /api/documentos/vencidos            # Documentos vencidos
GET    /api/documentos/cliente/:id/faltantes    # Documentos faltantes por cliente
GET    /api/documentos/cliente/:id/completitud  # Análisis de completitud
```

### 🆕 **ENDPOINTS ADMINISTRATIVOS NUEVOS**

#### Estadísticas y Dashboard
```
GET    /api/documentos/estadisticas        # Estadísticas generales para dashboard
GET    /api/documentos/estadisticas/tipos  # Análisis por tipo de documento
GET    /api/documentos/analisis/completitud # Análisis consolidado de completitud
GET    /api/documentos/metricas/equipo     # Performance del equipo de revisión
```

#### Gestión de Tipos de Documento
```
POST   /api/documentos/tipos               # Crear tipo de documento
PUT    /api/documentos/tipos/:id           # Actualizar tipo de documento
DELETE /api/documentos/tipos/:id           # Eliminar tipo de documento
```

#### Operaciones Masivas
```
PATCH  /api/documentos/lote/revisar        # Revisar múltiples documentos
GET    /api/documentos/exportar            # Exportar datos para análisis
```

## 🔐 Autorización y Permisos

### Roles y Permisos
- **ADMIN**: Acceso completo + gestión de tipos + estadísticas
- **SUPER**: Acceso completo + estadísticas
- **AUDITOR**: Solo lectura + estadísticas + exportación
- **OPERADOR**: Crear, leer, actualizar (no eliminar)
- **VIEWER**: Solo lectura

### Nuevos Endpoints por Rol
```typescript
// Estadísticas y análisis: ADMIN, SUPER, AUDITOR
// Gestión de tipos: ADMIN, SUPER
// Operaciones masivas: ADMIN, SUPER
// Exportación: ADMIN, SUPER, AUDITOR
```

## 📈 Funcionalidades Administrativas Nuevas

### 1. Dashboard de Documentos
- **Métricas en tiempo real**: Total documentos, por estatus, tendencias
- **Alertas automáticas**: Documentos próximos a vencer, colas de revisión
- **Eficiencia del equipo**: Tiempo promedio de revisión, tasa de aprobación
- **Tendencias**: Documentos subidos por día/semana, patrones

### 2. Análisis de Completitud Consolidado
- **Vista global**: Completitud por tipo de persona, rangos de completitud
- **Clientes críticos**: Lista de clientes con baja completitud
- **Recomendaciones**: Acciones sugeridas basadas en datos
- **Métricas de cumplimiento**: Porcentajes de completitud por segmento

### 3. Gestión de Tipos de Documento
- **CRUD completo**: Crear, editar, eliminar tipos de documento
- **Configuración avanzada**: Formatos, tamaños, vigencias personalizables
- **Aplicabilidad**: Configurar qué tipos aplican a cada tipo de persona
- **Validación de integridad**: Prevenir eliminación con documentos asociados

### 4. Operaciones Masivas
- **Revisión en lote**: Aprobar/rechazar múltiples documentos
- **Exportación flexible**: Datos filtrados para análisis externos
- **Procesamiento eficiente**: Transacciones atómicas, manejo de errores

### 5. Métricas del Equipo de Revisión
- **Performance individual**: Documentos revisados, tiempo promedio, calidad
- **Métricas consolidadas**: Performance del equipo completo
- **Clasificaciones automáticas**: Eficiencia (excelente/buena/regular/necesita mejora)
- **Distribución de carga**: Balanceo de trabajo entre revisores

## 🎯 Métodos Principales del Servicio

### DocumentoService - Funcionalidades Existentes
```typescript
// Gestión básica
createDocumento(data): Promise<Documento>
procesarDocumentos(documentos[], validaciones[]): Promise<Documento[]>
updateDocumento(id, data): Promise<Documento>
deleteDocumento(id): Promise<void>

// Consultas especializadas
getDocumentosByCliente(clienteId): Promise<Documento[]>
getDocumentosFaltantes(clienteId, tipoPersona): Promise<TipoDocumento[]>
verificarCompletitud(clienteId): Promise<CompletitudInfo>
```

### DocumentoService - 🆕 **NUEVAS FUNCIONALIDADES ADMINISTRATIVAS**

#### Estadísticas y Dashboard
```typescript
getEstadisticasGenerales(filtros?): Promise<EstadisticasDashboard>
// Retorna: totales, por estatus, métricas de tiempo, tendencias, alertas

getEstadisticasPorTipo(filtros?): Promise<EstadisticasTipo[]>
// Retorna: performance por tipo, problemáticos, revisión lenta, atención requerida

getAnalisisCompletitudConsolidado(filtros?): Promise<AnalisisCompletitud>
// Retorna: completitud promedio, rangos, clientes críticos, recomendaciones

getMetricasEquipoRevision(filtros?): Promise<MetricasEquipo>
// Retorna: performance individual y consolidada del equipo
```

#### Gestión de Tipos
```typescript
createTipoDocumento(data): Promise<DocumentoTipo>
updateTipoDocumento(id, data): Promise<DocumentoTipo>
deleteTipoDocumento(id, forzar?): Promise<ResultadoEliminacion>
```

#### Operaciones Masivas
```typescript
revisarDocumentosLote(ids[], accion, comentario?, revisorId?): Promise<ResultadoLote>
exportarDatosDocumentos(filtros?): Promise<DatosExportacion>
```

## 🔍 Ejemplos de Uso de Nuevas Funcionalidades

### Dashboard de Estadísticas
```json
GET /api/documentos/estadisticas?fechaInicio=2024-01-01&fechaFin=2024-01-31

Response:
{
  "success": true,
  "data": {
    "total_documentos": 1250,
    "clientes_con_documentos": 423,
    "pendientes": 89,
    "aceptados": 1067,
    "rechazados": 78,
    "vencidos": 16,
    "horas_promedio_revision": 18.5,
    "proximos_vencer_30_dias": 23,
    "subidos_hoy": 12,
    "subidos_semana": 87,
    "porcentaje_aprobacion": 93.2,
    "eficiencia_revision": "alta",
    "alerta_vencimientos": true,
    "tendencia_subidas": "creciente"
  }
}
```

### Análisis de Completitud Consolidado
```json
GET /api/documentos/analisis/completitud?tipoPersona=PF&umbral=80

Response:
{
  "success": true,
  "data": {
    "total_clientes": 256,
    "completitud_promedio": 82.5,
    "clientes_90_100": 145,
    "clientes_70_89": 78,
    "clientes_50_69": 25,
    "clientes_0_49": 8,
    "clientes_bajo_umbral": 33,
    "clientes_sin_documentos": 3,
    "clientes_criticos": [
      {
        "cliente_id": 123,
        "rfc": "PEGJ900101ABC",
        "correo": "juan@email.com",
        "porcentaje_completitud": 45.5,
        "documentos_faltantes": 3
      }
    ],
    "recomendaciones": {
      "seguimiento_requerido": true,
      "campana_documentos": false,
      "revision_procesos": false
    }
  }
}
```

### Métricas del Equipo de Revisión
```json
GET /api/documentos/metricas/equipo

Response:
{
  "success": true,
  "data": {
    "revisores": [
      {
        "usuario_id": 5,
        "revisor_nombre": "María García",
        "revisor_email": "maria@empresa.com",
        "documentos_revisados": 156,
        "documentos_aprobados": 142,
        "documentos_rechazados": 14,
        "tasa_aprobacion": 91.0,
        "horas_promedio_revision": 16.2,
        "revision_mas_rapida": 2,
        "revision_mas_lenta": 48,
        "clientes_atendidos": 89,
        "tipos_documento_manejados": 8,
        "performance": "excelente",
        "calidad": "alta",
        "carga_trabajo": "alta"
      }
    ],
    "equipo_consolidado": {
      "total_revisores_activos": 4,
      "promedio_documentos_por_revisor": 127.5,
      "tasa_aprobacion_equipo": 89.2,
      "tiempo_promedio_equipo": 21.3
    }
  }
}
```

### Operación Masiva - Revisión en Lote
```json
PATCH /api/documentos/lote/revisar
{
  "documento_ids": [101, 102, 103, 104, 105],
  "accion": "aceptar",
  "comentario": "Documentos válidos - revisión masiva"
}

Response:
{
  "success": true,
  "message": "Lote procesado: 4 documentos actualizados, 1 errores",
  "data": {
    "procesados": 4,
    "errores": 1,
    "documentos_actualizados": [
      {
        "documento_id": 101,
        "cliente_id": 23,
        "nuevo_estatus": "aceptado"
      }
    ],
    "errores_detalle": [
      "Documento 103: Ya fue revisado (aceptado)"
    ]
  }
}
```

### Crear Tipo de Documento
```json
POST /api/documentos/tipos
{
  "nombre": "Constancia Fiscal",
  "descripcion": "Constancia de situación fiscal del SAT",
  "aplica_pf": false,
  "aplica_pfae": true,
  "aplica_pm": true,
  "vigencia_dias": 90,
  "opcional": false,
  "formatos_permitidos": ["pdf"],
  "tamano_maximo_mb": 10
}

Response:
{
  "success": true,
  "message": "Tipo de documento creado exitosamente",
  "data": {
    "documento_tipo_id": 15,
    "nombre": "Constancia Fiscal",
    "descripcion": "Constancia de situación fiscal del SAT",
    "aplica_pf": false,
    "aplica_pfae": true,
    "aplica_pm": true,
    "vigencia_dias": 90,
    "opcional": false,
    "formatos_permitidos": ["pdf"],
    "tamano_maximo_mb": 10
  }
}
```

### Exportar Datos
```json
GET /api/documentos/exportar?fechaInicio=2024-01-01&estatus=pendiente,rechazado&incluirCliente=true

Response:
{
  "success": true,
  "data": {
    "total_registros": 234,
    "fecha_exportacion": "2024-01-15T10:30:00Z",
    "filtros_aplicados": {
      "fechaInicio": "2024-01-01",
      "estatus": ["pendiente", "rechazado"],
      "incluirDatosCliente": true
    },
    "documentos": [
      {
        "documento_id": 567,
        "cliente_id": 89,
        "cliente_rfc": "PEGJ900101ABC",
        "cliente_email": "juan@email.com",
        "cliente_nombre": "Juan Pérez García",
        "tipo_persona": "PF",
        "tipo_documento": "INE",
        "estatus": "pendiente",
        "fecha_documento": "2023-12-15",
        "fecha_subida": "2024-01-05T14:20:00Z",
        "fecha_expiracion": "2029-12-15",
        "esta_vencido": "No",
        "vence_pronto": "No",
        "dias_desde_subida": 10,
        "horas_para_revision": null
      }
    ]
  }
}
```

## ⚡ Optimizaciones Implementadas

### Base de Datos
- **Índices estratégicos**: cliente_id+tipo_id, estatus+fecha_subida, fecha_expiracion
- **Consultas optimizadas**: CTEs para análisis complejos, agregaciones eficientes
- **Transacciones atómicas**: Operaciones masivas seguras

### Performance
- **Caché inteligente**: Redis para estadísticas y consultas frecuentes
- **Consultas lazy**: Includes selectivos según necesidad
- **Paginación**: Límites en consultas masivas
- **Background processing**: Jobs para tareas pesadas

### Escalabilidad
- **Separación de responsabilidades**: Servicios especializados
- **Validaciones en capas**: Zod → Sequelize → Business Logic
- **APIs RESTful**: Endpoints consistentes y predecibles
- **Extensibilidad**: Servicios modulares y configurables

## 🚦 Estados y Flujos

### Estados del Documento
1. **Pendiente**: Subido, esperando revisión
2. **Aceptado**: Revisado y aprobado
3. **Rechazado**: Revisado y rechazado (requiere resubir)
4. **Vencido**: Documento expirado automáticamente

### Flujo de Gestión Documental
```
Upload → Validación → Pendiente → Revisión → Aceptado/Rechazado
                                          ↓
                                    Vencimiento Automático
```

## 🔧 Configuraciones

### Variables de Entorno Relevantes
```env
# Storage
GOOGLE_CLOUD_PROJECT_ID=proyecto-storage
GOOGLE_CLOUD_BUCKET=documentos-bucket

# Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL_SHORT=900  # 15 minutos
CACHE_TTL_LONG=3600  # 1 hora

# Archivos
MAX_FILE_SIZE_MB=10
ALLOWED_FORMATS=pdf,jpg,jpeg,png
```

### Configuraciones del Módulo
- **Tamaños máximos**: Configurables por tipo de documento
- **Formatos permitidos**: Extensibles según necesidades
- **Vigencias**: Personalizables por tipo
- **Caché TTL**: Optimizado por tipo de consulta

## 🧪 Testing y Validación

### Casos de Prueba Recomendados
1. **Upload de documentos**: Todos los formatos y tamaños
2. **Validaciones**: Tipos aplicables, fechas, integridad
3. **Operaciones masivas**: Lotes grandes, manejo de errores
4. **Estadísticas**: Precisión de cálculos, performance
5. **Caché**: Invalidación correcta, consistencia
6. **Autorización**: Permisos por rol, seguridad

### Métricas de Calidad
- **Cobertura de código**: Objetivo 95%+
- **Performance**: < 500ms estadísticas, < 200ms CRUD
- **Precisión**: 100% exactitud en cálculos
- **Seguridad**: Autorización completa, validación de archivos

## 📚 Próximas Mejoras

### Funcionalidades Pendientes
1. **AI/ML Integration**: Validación automática de documentos con IA
2. **Workflow Engine**: Flujos configurables de aprobación
3. **Digital Signatures**: Firma digital de documentos
4. **Notifications**: Alertas por email/SMS para vencimientos
5. **Advanced Analytics**: Machine learning para detección de fraudes

### Optimizaciones Técnicas
1. **CDN Integration**: Distribución global de documentos
2. **Image Processing**: Compresión y optimización automática
3. **Elasticsearch**: Búsqueda avanzada de contenido
4. **Webhooks**: Eventos para integraciones externas
5. **Background Jobs**: Procesamiento asíncrono masivo

---

## ✅ ESTADO ACTUAL: COMPLETO Y ENRIQUECIDO

El módulo Documento está **completamente implementado y enriquecido** con:
- ✅ Funcionalidades administrativas avanzadas
- ✅ Dashboard de estadísticas en tiempo real
- ✅ Análisis de completitud consolidado
- ✅ Métricas del equipo de revisión
- ✅ Gestión completa de tipos de documento
- ✅ Operaciones masivas eficientes
- ✅ Exportación de datos flexible
- ✅ Caché inteligente optimizado
- ✅ Autorización granular por roles
- ✅ APIs RESTful completas
- ✅ Documentación exhaustiva

**¡El módulo está listo para administración empresarial avanzada!** 🎉

### 🎯 **ENDPOINTS RESUMEN FINAL**

| **Categoría** | **Endpoints** | **Funcionalidad** |
|---------------|---------------|-------------------|
| **CRUD Básico** | 6 endpoints | Gestión fundamental |
| **Administrativo** | 9 endpoints | Dashboard y análisis |
| **Operaciones Masivas** | 2 endpoints | Procesamiento en lote |
| **Gestión Tipos** | 4 endpoints | Configuración avanzada |
| **TOTAL** | **21 endpoints** | **Sistema completo** |

### 📊 **CAPACIDADES ADMINISTRATIVAS**

- **Dashboard en Tiempo Real** con métricas críticas
- **Análisis Predictivo** de completitud y tendencias  
- **Gestión de Performance** del equipo de revisión
- **Operaciones Masivas** para eficiencia operativa
- **Configuración Flexible** de tipos y validaciones
- **Exportación Avanzada** para análisis externos
- **Autorización Granular** para seguridad empresarial

**¡Preparado para manejar miles de documentos con eficiencia empresarial!** 🚀
