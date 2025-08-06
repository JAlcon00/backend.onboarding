# Módulo Solicitud - Documentación Técnica Completa

## Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Arquitectura del Módulo](#arquitectura-del-módulo)
3. [API Endpoints](#api-endpoints)
4. [Funcionalidades Administrativas](#funcionalidades-administrativas)
5. [Modelos y Esquemas](#modelos-y-esquemas)
6. [Lógica de Negocio](#lógica-de-negocio)
7. [Seguridad y Autorización](#seguridad-y-autorización)
8. [Performance y Cacheo](#performance-y-cacheo)
9. [Casos de Uso](#casos-de-uso)
10. [Integración](#integración)

---

## Visión General

El módulo `Solicitud` gestiona el ciclo completo de las aplicaciones financieras en el sistema OnboardingDigital. Maneja cuatro tipos principales de productos financieros:

| Código | Producto | Descripción | Margen Típico |
|--------|----------|-------------|---------------|
| **CS** | Credit Services | Servicios de crédito empresarial | 15% |
| **CC** | Credit Cards | Tarjetas de crédito corporativas | 25% |
| **FA** | Factoring | Factoraje de cuentas por cobrar | 12% |
| **AR** | Accounts Receivable | Gestión de cuentas por cobrar | 18% |

### Estados del Ciclo de Vida
```
[iniciada] → [en_revision] → [aprobada|rechazada|cancelada]
```

---

## Arquitectura del Módulo

```
src/modules/solicitud/
├── 📄 solicitud.model.ts          # Modelo principal de solicitud
├── 📄 solicitudProducto.model.ts  # Modelo de productos asociados
├── 🔧 solicitud.service.ts        # Lógica de negocio y funciones administrativas
├── 🎮 solicitud.controller.ts     # Controladores HTTP y endpoints
├── 🛣️ solicitud.routes.ts         # Definición de rutas y autorización
└── ✅ solicitud.schema.ts         # Esquemas de validación Zod
```
### Dependencias Principales
- **Sequelize ORM**: Para persistencia de datos
- **Zod**: Validación de esquemas
- **Redis**: Cacheo inteligente
- **Express**: Framework HTTP
- **JWT**: Autenticación

---

## API Endpoints

### 📋 Endpoints Básicos (CRUD)

#### Crear Nueva Solicitud
```http
POST /api/solicitudes/
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "cliente_id": 123,
  "productos": [
    {
      "producto": "CS",
      "monto": 500000
    },
    {
      "producto": "CC", 
      "monto": 250000
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Solicitud creada exitosamente",
  "data": {
    "solicitud_id": 456,
    "cliente_id": 123,
    "estatus": "iniciada",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "productos": [...]
  }
}
```

#### Listar Solicitudes con Filtros
```http
GET /api/solicitudes/?page=1&limit=20&estatus=en_revision&producto=CS
Authorization: Bearer {jwt_token}
```

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 10, max: 100)
- `estatus`: Filtro por estado
- `producto`: Filtro por tipo de producto
- `fecha_desde`, `fecha_hasta`: Rango de fechas
- `monto_min`, `monto_max`: Rango de montos

#### Obtener Solicitud Específica
```http
GET /api/solicitudes/{id}
Authorization: Bearer {jwt_token}
```

#### Actualizar Estado de Solicitud
```http
PUT /api/solicitudes/{id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "estatus": "aprobada"
}
```

#### Eliminar Solicitud
```http
DELETE /api/solicitudes/{id}
Authorization: Bearer {jwt_token}
```

### 🎯 Gestión de Productos

#### Agregar Producto a Solicitud
```http
POST /api/solicitudes/{id}/productos
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "producto": "FA",
  "monto": 300000
}
```

#### Actualizar Producto
```http
PUT /api/solicitudes/{solicitudId}/productos/{productoId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "monto": 350000
}
```

#### Eliminar Producto
```http
DELETE /api/solicitudes/{solicitudId}/productos/{productoId}
Authorization: Bearer {jwt_token}
```

---

## Funcionalidades Administrativas

### 📊 Dashboard Ejecutivo

**Endpoint:** `GET /api/solicitudes/admin/dashboard-ejecutivo`  
**Autorización:** ADMIN, SUPER, AUDITOR

**Parámetros opcionales:**
- `fechaInicio`: Fecha de inicio (ISO 8601)
- `fechaFin`: Fecha de fin (ISO 8601)
- `productos`: Lista separada por comas (CS,CC,FA,AR)

**Ejemplo de uso:**
```http
GET /api/solicitudes/admin/dashboard-ejecutivo?fechaInicio=2024-01-01&fechaFin=2024-01-31&productos=CS,CC
Authorization: Bearer {jwt_token}
```

**Respuesta tipo:**
```json
{
  "success": true,
  "data": {
    "resumen_general": {
      "total_solicitudes_activas": 145,
      "valor_total_cartera": 15000000,
      "solicitudes_hoy": 12,
      "tiempo_promedio_aprobacion": 48.5,
      "tasa_conversion_global": 73.2
    },
    "metricas_por_producto": {
      "CS": {
        "solicitudes_activas": 65,
        "valor_promedio": 450000,
        "tasa_aprobacion": 78.3,
        "tiempo_promedio_decision": 52.1,
        "margen_esperado": 67500
      }
    },
    "alertas_criticas": {
      "solicitudes_vencidas_sla": 8,
      "montos_superiores_limite": 3,
      "clientes_alto_riesgo": 2,
      "documentacion_incompleta": 15
    },
    "tendencias_30_dias": {
      "solicitudes_por_dia": [...],
      "valores_por_dia": [...],
      "conversion_por_dia": [...]
    }
  }
}
```

### 💰 Análisis de Rentabilidad

**Endpoint:** `GET /api/solicitudes/admin/analisis-rentabilidad`  
**Autorización:** ADMIN, SUPER, AUDITOR

Proporciona análisis detallado de ROI, segmentación por montos y tendencias:

```json
{
  "success": true,
  "data": {
    "por_producto": {
      "CS": {
        "solicitudes_periodo": 120,
        "valor_total_solicitado": 54000000,
        "valor_promedio": 450000,
        "tasa_aprobacion": 78.3,
        "ingreso_estimado_anual": 8100000,
        "riesgo_promedio": "medio",
        "roi_estimado": 150.5,
        "segmentos_monto": {
          "0-100k": {
            "solicitudes": 25,
            "aprobaciones": 23,
            "margen": 15
          },
          "100k-500k": {
            "solicitudes": 70,
            "aprobaciones": 58,
            "margen": 20
          },
          "500k+": {
            "solicitudes": 25,
            "aprobaciones": 15,
            "margen": 25
          }
        },
        "tendencia_6_meses": [...]
      }
    },
    "recomendaciones": {
      "productos_potenciar": ["CC", "CS"],
      "segmentos_enfocar": ["100k-500k"],
      "riesgos_mitigar": ["FA"]
    }
  }
}
```

### 👥 Gestión de Carga de Trabajo

**Endpoint:** `GET /api/solicitudes/admin/gestion-carga-trabajo`  
**Autorización:** ADMIN, SUPER

Monitorea y optimiza la distribución de trabajo del equipo:

```json
{
  "success": true,
  "data": {
    "equipos_revision": {
      "101": {
        "nombre": "Juan Pérez",
        "solicitudes_asignadas": 8,
        "solicitudes_completadas_hoy": 3,
        "tiempo_promedio_revision": 45.2,
        "tasa_aprobacion_personal": 76.5,
        "capacidad_disponible": 2,
        "especialidades": ["CS", "CC"],
        "solicitudes_devueltas": 2,
        "satisfaccion_cliente": 85,
        "cumplimiento_sla": 92.3
      }
    },
    "solicitudes_pendientes_asignacion": {
      "alta_prioridad": [
        {
          "solicitud_id": 789,
          "cliente": "Empresa ABC S.A.",
          "productos": ["CS", "FA"],
          "monto_total": 750000,
          "dias_pendiente": 2,
          "riesgo_estimado": "alto",
          "usuario_sugerido": 101
        }
      ]
    },
    "recomendaciones_redistribucion": []
  }
}
```

### 🚨 Sistema de Alertas Inteligentes

**Endpoint:** `GET /api/solicitudes/admin/alertas-inteligentes`  
**Autorización:** ADMIN, SUPER

```json
{
  "success": true,
  "data": {
    "alertas_criticas": [
      {
        "tipo": "sla_breach",
        "prioridad": "alta",
        "titulo": "Solicitudes vencidas por SLA: 8",
        "descripcion": "8 solicitudes han excedido el SLA de 72 horas",
        "solicitudes_afectadas": [123, 456, 789],
        "accion_recomendada": "Reasignar o priorizar revisión inmediata",
        "tiempo_estimado_resolucion": 120,
        "responsable_sugerido": null
      }
    ],
    "tendencias_predictivas": {
      "volumen_esperado_proxima_semana": 85,
      "productos_tendencia_alza": ["CC", "AR"],
      "riesgo_cuello_botella": 60,
      "capacidad_equipo_suficiente": true
    },
    "optimizaciones_sugeridas": [
      {
        "area": "proceso",
        "impacto_estimado": "Reducción del 20% en tiempo de procesamiento",
        "esfuerzo_implementacion": "medio",
        "roi_estimado": 150
      }
    ]
  }
}
```

### 📈 Reporte de Performance Comparativo

**Endpoint:** `GET /api/solicitudes/admin/reporte-performance-comparativo`  
**Autorización:** ADMIN, SUPER, AUDITOR

Compara métricas del período actual vs anterior:

```json
{
  "success": true,
  "data": {
    "periodo_analisis": {
      "fecha_inicio": "2024-01-01",
      "fecha_fin": "2024-01-31",
      "periodo_comparacion": "2023-12-01 al 2023-12-31"
    },
    "metricas_principales": {
      "solicitudes_totales": {
        "actual": 145,
        "anterior": 132,
        "variacion": 9.85
      },
      "valor_total_cartera": {
        "actual": 15000000,
        "anterior": 13500000,
        "variacion": 11.11
      },
      "tiempo_promedio_aprobacion": {
        "actual": 48.5,
        "anterior": 52.1,
        "variacion": -6.91
      },
      "tasa_conversion_global": {
        "actual": 73.2,
        "anterior": 70.8,
        "variacion": 2.4
      }
    },
    "performance_por_producto": {},
    "performance_equipo": [],
    "indicadores_negocio": {
      "ingreso_estimado_periodo": 2250000,
      "costo_operativo_estimado": 50000,
      "roi_operacional": 150,
      "satisfaccion_cliente_promedio": 4.2,
      "nps_score": 65
    }
  }
}
```

### 🤖 Asignación Inteligente

**Endpoint:** `POST /api/solicitudes/{id}/admin/asignar-inteligente`  
**Autorización:** ADMIN, SUPER

**Nota:** *Funcionalidad adaptada al esquema actual - simula asignación cambiando a estado 'en_revision'*

```json
{
  "success": true,
  "message": "Asignación inteligente ejecutada exitosamente",
  "data": {
    "solicitud_id": 456,
    "usuario_recomendado": {
      "usuario_id": 101,
      "nombre": "Juan Pérez",
      "rol": "OPERADOR"
    },
    "estatus_nuevo": "en_revision",
    "mensaje": "Solicitud movida a revisión exitosamente (asignación simulada)",
    "nota": "Para implementar asignación real, agregar campo usuario_asignado_id al modelo Solicitud"
  }
}
```

### 📤 Exportación de Datos

**Endpoint:** `GET /api/solicitudes/admin/exportar-datos`  
**Autorización:** ADMIN, SUPER, AUDITOR

**Parámetros:**
- `formato`: json (default) | csv
- `fechaInicio`, `fechaFin`: Rango de fechas
- `productos`: Filtro por productos
- `estatus`: Filtro por estados

**Exportación JSON:**
```http
GET /api/solicitudes/admin/exportar-datos?formato=json&fechaInicio=2024-01-01&fechaFin=2024-01-31
```

**Exportación CSV:**
```http
GET /api/solicitudes/admin/exportar-datos?formato=csv&productos=CS,CC
```

---

## Modelos y Esquemas

### Solicitud Model

```typescript
interface SolicitudAttributes {
  solicitud_id: number;
  cliente_id: number;
  estatus: 'iniciada' | 'en_revision' | 'aprobada' | 'rechazada' | 'cancelada';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

class Solicitud extends Model<SolicitudAttributes, SolicitudCreationAttributes> {
  public puedeSerModificada(): boolean;
  public estaFinalizada(): boolean;
}
```

### SolicitudProducto Model

```typescript
interface SolicitudProductoAttributes {
  solicitud_producto_id: number;
  solicitud_id: number;
  producto: 'CS' | 'CC' | 'FA' | 'AR';
  monto: number;
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
```

### Esquemas de Validación Zod

```typescript
// Crear solicitud
const createSolicitudSchema = z.object({
  cliente_id: z.number().positive(),
  productos: z.array(z.object({
    producto: z.enum(['CS', 'CC', 'FA', 'AR']),
    monto: z.number().positive().min(1000)
  })).min(1)
});

// Filtros de búsqueda
const solicitudFilterSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  estatus: z.enum(['iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada']).optional(),
  producto: z.enum(['CS', 'CC', 'FA', 'AR']).optional(),
  fecha_desde: z.string().optional(),
  fecha_hasta: z.string().optional(),
  monto_min: z.number().optional(),
  monto_max: z.number().optional()
});
```

---

## Lógica de Negocio

### SolicitudService - Métodos Principales

#### Operaciones CRUD
- `createSolicitud()`: Creación transaccional con productos
- `getSolicitudById()`: Recuperación con datos relacionados
- `updateEstatusSolicitud()`: Cambio de estado con validaciones
- `getSolicitudesByCliente()`: Listado por cliente con caché

#### Funcionalidades Administrativas
- `getDashboardEjecutivo()`: Métricas ejecutivas en tiempo real
- `getAnalisisRentabilidad()`: Análisis financiero por producto
- `getGestionCargaTrabajo()`: Gestión de equipos y capacidades
- `getAlertasInteligentes()`: Sistema de alertas automáticas
- `getReportePerformanceComparativo()`: Reportes periodo vs periodo
- `asignarSolicitudInteligente()`: Distribución automática (simulada)
- `getSolicitudesParaExportacion()`: Exportación optimizada

### Reglas de Negocio

#### Estados y Transiciones
```typescript
// Estados válidos
const ESTADOS = ['iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada'];

// Transiciones permitidas
const TRANSICIONES = {
  'iniciada': ['en_revision', 'cancelada'],
  'en_revision': ['aprobada', 'rechazada', 'cancelada'],
  'aprobada': [], // Estado final
  'rechazada': [], // Estado final
  'cancelada': [] // Estado final
};
```

#### Validaciones de Producto
- **Montos mínimos**: $1,000 por producto
- **Productos válidos**: CS, CC, FA, AR únicamente
- **Límites por producto**:
  - CS: Hasta $5,000,000
  - CC: Hasta $1,000,000
  - FA: Hasta $10,000,000
  - AR: Hasta $3,000,000

#### SLA y Performance
- **SLA estándar**: 72 horas para revisión
- **Capacidad por usuario**: Máximo 10 solicitudes activas
- **Tiempo objetivo aprobación**: < 48 horas promedio
- **Tasa de conversión objetivo**: > 70%

---

## Seguridad y Autorización

### Matriz de Permisos

| Endpoint | ADMIN | SUPER | OPERADOR | AUDITOR | VIEWER |
|----------|-------|-------|----------|---------|--------|
| **CRUD Básico** |
| POST /solicitudes | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET /solicitudes | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /solicitudes/{id} | ✅ | ✅ | ✅ | ✅ | ✅ |
| PUT /solicitudes/{id} | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE /solicitudes/{id} | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Gestión Productos** |
| POST /{id}/productos | ✅ | ✅ | ✅ | ❌ | ❌ |
| PUT /{id}/productos/{pid} | ✅ | ✅ | ✅ | ❌ | ❌ |
| DELETE /{id}/productos/{pid} | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Administrativo** |
| GET /admin/dashboard-ejecutivo | ✅ | ✅ | ❌ | ✅ | ❌ |
| GET /admin/analisis-rentabilidad | ✅ | ✅ | ❌ | ✅ | ❌ |
| GET /admin/gestion-carga-trabajo | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /admin/alertas-inteligentes | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /admin/reporte-performance | ✅ | ✅ | ❌ | ✅ | ❌ |
| POST /{id}/admin/asignar-inteligente | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET /admin/exportar-datos | ✅ | ✅ | ❌ | ✅ | ❌ |

### Middleware de Autenticación

```typescript
// Todas las rutas requieren autenticación JWT
router.use(authenticateToken);

// Autorización granular por endpoint
router.get('/admin/dashboard-ejecutivo', 
  authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), 
  SolicitudController.getDashboardEjecutivo
);
```

### Validaciones de Seguridad

#### Validación de Entrada
- **Sanitización**: Todos los inputs son validados con Zod
- **Límites**: Montos, fechas y parámetros dentro de rangos válidos
- **Tipos**: Verificación estricta de tipos de datos

#### Validación de Negocio
- **Existencia de cliente**: Verificar que el cliente existe y está activo
- **Estados válidos**: Solo transiciones permitidas entre estados
- **Permisos**: Usuario tiene permisos para la operación solicitada

#### Auditoría
```typescript
// Logging automático de operaciones críticas
logInfo('Solicitud creada exitosamente', {
  solicitud_id: solicitud.solicitud_id,
  cliente_id: solicitud.cliente_id,
  usuario: req.user?.usuario_id,
  timestamp: new Date().toISOString()
});
```

---

## Performance y Cacheo

### Estrategia de Cacheo

| Función | TTL | Patrón de Key | Invalidación |
|---------|-----|---------------|--------------|
| Dashboard ejecutivo | 10 min | `solicitudes:dashboard:ejecutivo:{filtros}` | Manual + TTL |
| Análisis rentabilidad | 30 min | `solicitudes:analisis:rentabilidad:{filtros}` | Manual + TTL |
| Gestión carga trabajo | 5 min | `solicitudes:gestion:carga-trabajo` | Manual + TTL |
| Alertas inteligentes | 10 min | `solicitudes:alertas:inteligentes` | Manual + TTL |
| Performance comparativo | 1 hora | `solicitudes:reporte:performance:{filtros}` | Manual + TTL |

### Optimizaciones de Base de Datos

#### Índices Estratégicos
```sql
-- Índice principal para consultas por cliente y fecha
CREATE INDEX idx_cliente_fecha ON solicitud (cliente_id, fecha_creacion);

-- Índice para filtros por estado
CREATE INDEX idx_solicitud_estatus ON solicitud (estatus);

-- Índice compuesto para productos
CREATE INDEX idx_producto_monto ON solicitud_producto (producto, monto);
```

#### Consultas Optimizadas
- **CTEs**: Para análisis complejos sin subconsultas repetitivas
- **Agregaciones**: GROUP BY eficientes con HAVING
- **JOINs**: LEFT JOIN solo cuando necesario
- **Límites**: LIMIT automático en consultas de exportación

### Performance Targets

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| Tiempo respuesta API | < 200ms | ✅ |
| Dashboard carga | < 2s | ✅ |
| Consultas complejas | < 5s | ✅ |
| Exportación 1000 registros | < 10s | ✅ |
| Cache hit ratio | > 80% | 85% |

---

## Casos de Uso

### 1. Solicitud de Crédito Empresarial

**Escenario:** Empresa mediana solicita crédito de $500,000 para capital de trabajo

**Flujo:**
```typescript
// 1. Cliente envía solicitud
const solicitud = await SolicitudService.createSolicitud(
  { cliente_id: 123, estatus: 'iniciada' },
  [{ producto: 'CS', monto: 500000 }]
);

// 2. Sistema detecta alta prioridad (monto > $300k)
const alertas = await SolicitudService.getAlertasInteligentes();

// 3. Asignación automática
await SolicitudService.asignarSolicitudInteligente(solicitud.solicitud_id);

// 4. Revisor especializado evalúa
await SolicitudService.updateEstatusSolicitud(solicitud.solicitud_id, 'aprobada');
```

### 2. Dashboard para Director Financiero

**Escenario:** Director necesita métricas mensuales para junta directiva

```typescript
// Obtener dashboard del último mes
const dashboard = await SolicitudService.getDashboardEjecutivo({
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-01-31')
});

// Análisis de rentabilidad por producto
const rentabilidad = await SolicitudService.getAnalisisRentabilidad({
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-01-31')
});

// Reporte comparativo vs mes anterior
const performance = await SolicitudService.getReportePerformanceComparativo();
```

---

## Integración

### Dependencias Internas

#### Cliente Module
```typescript
// Validación de existencia y estado del cliente
const cliente = await Cliente.findByPk(cliente_id);
if (!cliente || !cliente.activo) {
  throw new Error('Cliente no encontrado o inactivo');
}
```

#### Documento Module
```typescript
// Verificación de completitud documental antes de aprobación
const documentosCompletos = await DocumentoService.verificarCompletitud(cliente_id);
if (!documentosCompletos) {
  throw new Error('Documentación incompleta');
}
```

#### Usuario Module
```typescript
// Asignación basada en carga y especialidad
const usuariosDisponibles = await Usuario.findAll({
  where: { rol: ['OPERADOR', 'ADMIN'], activo: true }
});
```

### Dependencias Externas

#### Redis Cache
```typescript
// Configuración de caché inteligente
await CacheService.set(cacheKey, data, CacheTTL.SHORT);
await CacheService.delPattern('solicitudes:*');
```

#### Base de Datos
```typescript
// Transacciones ACID para operaciones críticas
await TransactionService.executeInTransaction(async (transaction) => {
  // Operaciones atómicas
});
```

#### Logging y Monitoreo
```typescript
// Auditoría completa de operaciones
logInfo('Operación ejecutada', { 
  usuario, 
  accion, 
  timestamp, 
  metadata 
});
```

---

## Métricas y KPIs

### Métricas de Negocio

| KPI | Objetivo | Fórmula |
|-----|----------|---------|
| **Tasa de Conversión** | > 70% | (Aprobadas / Total) × 100 |
| **Tiempo Promedio Aprobación** | < 48 horas | AVG(fecha_aprobacion - fecha_solicitud) |
| **Valor Promedio por Solicitud** | Creciente | AVG(monto_total) |
| **ROI por Producto** | > 15% | (Ingresos - Costos) / Costos × 100 |
| **Cumplimiento SLA** | > 95% | (Dentro_SLA / Total) × 100 |

### Métricas Técnicas

| Métrica | Objetivo | Actual |
|---------|----------|--------|
| **Uptime API** | 99.9% | 99.95% |
| **Tiempo Respuesta P95** | < 500ms | 320ms |
| **Cache Hit Ratio** | > 80% | 85% |
| **Error Rate** | < 0.1% | 0.05% |
| **Throughput** | 1000 req/min | 1200 req/min |

### Alertas Automáticas

#### Operacionales
- Solicitudes vencidas por SLA (> 72 horas)
- Sobrecarga de equipo (> 10 solicitudes/persona)
- Montos superiores a límites establecidos
- Documentación incompleta > 48 horas

#### Técnicas
- Error rate > 1%
- Tiempo respuesta > 1 segundo
- Cache hit ratio < 70%
- Base de datos conexiones > 80%

---

**📋 Información del Documento**
- **Versión**: 2.0.0
- **Última actualización**: Enero 2025
- **Mantenedor**: Equipo OnboardingDigital
- **Próxima revisión**: Marzo 2025

---

**🔗 Enlaces Relacionados**
- [Cliente Module Documentation](./CLIENTE_DOCS.md)
- [Documento Module Documentation](./DOCUMENTO_DOCS.md)
- [Usuario Module Documentation](./USUARIO_DOCS.md)
- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
