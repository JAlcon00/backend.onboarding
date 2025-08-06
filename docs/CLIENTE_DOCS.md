# 📋 MÓDULO CLIENTE - DOCUMENTACIÓN COMPLETA

## 🎯 Descripción General
El módulo Cliente es el núcleo del sistema de onboarding digital, diseñado para gestionar toda la información de clientes (Personas Físicas, Personas Físicas con Actividad Empresarial y Personas Morales) con funcionalidades completas de CRUD, validaciones de negocio y seguimiento del proceso de onboarding.

## 🏗️ Arquitectura del Módulo

### Archivos del Módulo
```
src/modules/cliente/
├── cliente.model.ts          # Modelo Sequelize principal
├── ingresoCliente.model.ts   # Modelo para información de ingresos
├── cliente.schema.ts         # Validaciones Zod
├── cliente.controller.ts     # Controladores HTTP
├── cliente.service.ts        # Lógica de negocio
├── onboarding.service.ts     # Lógica específica de onboarding
├── cliente.routes.ts         # Definición de rutas
└── CLIENTE_DOCS.md          # Esta documentación
```

## 📊 Modelos de Datos

### Cliente (Tabla Principal)
- **cliente_id**: ID único autoincrementable
- **tipo_persona**: 'PF' | 'PF_AE' | 'PM'
- **Datos Personas Físicas**: nombre, apellido_paterno, apellido_materno, fecha_nacimiento, curp
- **Datos Personas Morales**: razon_social, fecha_constitucion, representante_legal
- **Datos Generales**: rfc, correo, telefono
- **Dirección**: calle, numero_exterior, numero_interior, colonia, codigo_postal, ciudad, estado, pais
- **Metadata**: created_at, updated_at

### IngresoCliente (Información Financiera)
- **ingreso_id**: ID único
- **cliente_id**: Referencia al cliente
- **tipo_persona**: Tipo de persona (redundante para consultas)
- **sector**: Sector económico
- **giro**: Giro específico del negocio
- **ingreso_anual**: Cantidad decimal
- **moneda**: Código de moneda (default: MXN)
- **fecha_registro**: Timestamp de registro

## 🔒 Validaciones Implementadas

### Validaciones de Esquema (Zod)
1. **RFC por tipo de persona**:
   - PF/PF_AE: 4 letras + 6 dígitos + 3 caracteres
   - PM: 3 letras + 6 dígitos + 3 caracteres

2. **Validación de edad**: Mínimo 18 años para personas físicas

3. **Campos obligatorios según tipo**:
   - PF/PF_AE: nombre, apellido_paterno, fecha_nacimiento, curp
   - PM: razon_social, fecha_constitucion, representante_legal

4. **CURP**: Formato estándar de 18 caracteres

### Validaciones de Modelo (Sequelize)
- Email único y formato válido
- RFC único
- Validaciones cruzadas en el modelo

### Validaciones de Negocio (Servicio)
- Unicidad de RFC y correo al crear/actualizar
- Integridad de datos según tipo de persona
- Completitud de expediente para onboarding

## 🚀 Endpoints de la API

### Gestión Básica de Clientes
```
POST   /api/clientes/                    # Crear cliente
GET    /api/clientes/                    # Listar clientes (con filtros)
GET    /api/clientes/:id                 # Obtener cliente por ID
PUT    /api/clientes/:id                 # Actualizar cliente
DELETE /api/clientes/:id                 # Eliminar cliente
```

### Gestión de Ingresos
```
POST   /api/clientes/:id/ingresos        # Registrar ingreso
GET    /api/clientes/:id/ingresos        # Obtener ingresos del cliente
GET    /api/clientes/:id/ingresos/estadisticas # Obtener estadísticas de ingresos
```

### Búsqueda Especializada
```
GET    /api/clientes/buscar/rfc/:rfc     # Buscar por RFC
GET    /api/clientes/estadisticas        # Estadísticas generales
```

### Onboarding y Completitud
```
GET    /api/clientes/:id/completitud     # Validar completitud del expediente
GET    /api/clientes/:id/onboarding      # Estado completo del onboarding
GET    /api/clientes/:id/onboarding/verificar  # Verificar si puede proceder
```

## 🔐 Autorización y Permisos

### Roles y Permisos
- **ADMIN**: Acceso completo
- **SUPER**: Acceso completo
- **OPERADOR**: Crear, leer, actualizar (no eliminar)
- **VIEWER**: Solo lectura

### Endpoints por Rol
```typescript
// Crear, actualizar ingresos: ADMIN, SUPER, OPERADOR
// Eliminar cliente, estadísticas: ADMIN, SUPER
// Lectura general: Todos los roles autenticados
```

## 📈 Funcionalidades de Onboarding

### Sistema de Pasos
1. **Datos Básicos**: Información personal/empresarial
2. **Dirección**: Domicilio completo
3. **Información de Ingresos**: Registros financieros
4. **Documentos de Identidad**: Identificación oficial
5. **Comprobantes**: Ingresos y domicilio
6. **Revisión de Cumplimiento**: Validación KYC/AML

### Métricas de Completitud
- **Porcentaje de completitud**: Cálculo automático
- **Campos faltantes**: Lista específica
- **Estado del expediente**: incompleto | completo | en_revision | aprobado
- **Siguiente paso**: Próxima acción requerida

## 🎯 Métodos Principales del Modelo

### Cliente Model
```typescript
// Métodos de instancia
getNombreCompleto(): string
isDatosBasicosCompletos(): boolean
isDireccionCompleta(): boolean
getPorcentajeCompletitud(): number
getCamposRequeridosPublic(): string[]
esCampoCompletoPublic(campo: string): boolean
```

### ClienteService
```typescript
// Métodos estáticos
createCliente(data): Promise<Cliente>
updateCliente(id, data): Promise<Cliente>
buscarClientes(filtros): Promise<WhereCondition>
getResumenFinanciero(clienteId): Promise<ResumenFinanciero>
validarIntegridadDatos(cliente): string[]
getCamposFaltantes(cliente): string[]
getEstadisticasGenerales(): Promise<Estadisticas>
puedeProcedeConOnboarding(clienteId): Promise<ValidacionOnboarding>
```

### OnboardingService
```typescript
// Métodos para gestión de onboarding
getEstadoOnboarding(clienteId): Promise<OnboardingStatus>
puedeAvanzarAlSiguientePaso(clienteId, paso): Promise<ValidacionPaso>
```

## 🔍 Ejemplos de Uso

### Crear Cliente Persona Física
```json
POST /api/clientes/
{
  "tipo_persona": "PF",
  "nombre": "Juan",
  "apellido_paterno": "Pérez",
  "apellido_materno": "García",
  "rfc": "PEGJ900101ABC",
  "curp": "PEGJ900101HDFRRN01",
  "fecha_nacimiento": "1990-01-01",
  "correo": "juan.perez@email.com",
  "telefono": "5551234567",
  "calle": "Av. Principal",
  "numero_exterior": "123",
  "colonia": "Centro",
  "codigo_postal": "01000",
  "ciudad": "Ciudad de México",
  "estado": "CDMX",
  "pais": "México"
}
```

### Crear Cliente Persona Moral
```json
POST /api/clientes/
{
  "tipo_persona": "PM",
  "razon_social": "Empresa Ejemplo S.A. de C.V.",
  "representante_legal": "María Fernández López",
  "rfc": "EEJ200101ABC",
  "fecha_constitucion": "2020-01-01",
  "correo": "contacto@empresa.com",
  "telefono": "5559876543",
  "calle": "Blvd. Empresarial",
  "numero_exterior": "456",
  "colonia": "Zona Industrial",
  "codigo_postal": "02000",
  "ciudad": "Guadalajara",
  "estado": "Jalisco",
  "pais": "México"
}
```

### Registrar Ingresos
```json
POST /api/clientes/1/ingresos
{
  "tipo_persona": "PF",
  "sector": "Tecnología",
  "giro": "Desarrollo de Software",
  "ingreso_anual": 500000.00,
  "moneda": "MXN"
}
```

### Consultar Estado de Onboarding
```json
GET /api/clientes/1/onboarding

Response:
{
  "success": true,
  "data": {
    "cliente_id": 1,
    "estado_general": "incompleto",
    "pasos_completados": [
      {
        "paso": "datos_basicos",
        "nombre": "Datos Básicos",
        "completado": true,
        "orden": 1
      }
    ],
    "pasos_pendientes": [
      {
        "paso": "documentos_identidad",
        "nombre": "Documentos de Identidad",
        "completado": false,
        "orden": 4
      }
    ],
    "porcentaje_completitud": 75,
    "puede_proceder": false,
    "siguiente_paso": "Documentos de Identidad",
    "documentos_requeridos": [
      "identificacion_oficial",
      "comprobante_domicilio",
      "comprobante_ingresos"
    ]
  }
}
```

## ⚡ Optimizaciones Implementadas

### Base de Datos
- **Índices estratégicos**: RFC+created_at, código postal, tipo+estado
- **Consultas optimizadas**: Includes selectivos, paginación
- **Validaciones a nivel DB**: Constraints y validaciones Sequelize

### Performance
- **Paginación por defecto**: Límite máximo de 100 registros
- **Consultas lazy**: Relaciones cargadas solo cuando se necesitan
- **Caching de cálculos**: Métodos optimizados para completitud

### Escalabilidad
- **Separación de responsabilidades**: Controller, Service, Model
- **Validaciones en capas**: Zod → Sequelize → Business Logic
- **Extensibilidad**: Servicios modulares para onboarding

## 🚦 Estados y Flujos

### Estados del Cliente
1. **Nuevo**: Recién creado, datos básicos
2. **En Proceso**: Completando información
3. **Completo**: Todos los datos requeridos
4. **En Revisión**: Pendiente de aprobación
5. **Aprobado**: Listo para productos/servicios

### Flujo de Onboarding
```
Registro → Datos Básicos → Dirección → Ingresos → Documentos → Revisión → Aprobación
```

## 🔧 Configuraciones

### Variables de Entorno Relevantes
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=onboarding_digital
DB_USER=usuario
DB_PASS=password
```

### Configuraciones del Módulo
- **Límite de paginación**: 100 registros máximo
- **Campos requeridos**: Configurables por tipo de persona
- **Validaciones**: Personalizables en schemas Zod

## 🧪 Testing y Validación

### Casos de Prueba Recomendados
1. **Creación de clientes**: Todos los tipos de persona
2. **Validaciones RFC/CURP**: Formatos correctos e incorrectos
3. **Unicidad**: RFC y correo duplicados
4. **Completitud**: Cálculos de porcentajes
5. **Búsquedas**: Filtros y paginación
6. **Onboarding**: Estados y transiciones

### Métricas de Calidad
- **Cobertura de código**: Objetivo 90%+
- **Validación de datos**: 100% de campos críticos
- **Performance**: < 200ms respuesta promedio
- **Seguridad**: Autorización en todos los endpoints

## 📚 Próximas Mejoras

### Funcionalidades Pendientes
1. **Integración completa con Documentos**: Referencias bidireccionales
2. **Validaciones KYC/AML**: Listas negras, PEPs
3. **Audit Trail**: Historial de cambios
4. **Notificaciones**: Estados del onboarding
5. **Reportes avanzados**: Analytics y métricas

### Optimizaciones Técnicas
1. **Caching Redis**: Consultas frecuentes
2. **Search Engine**: Elasticsearch para búsquedas
3. **Webhooks**: Eventos de cambio de estado
4. **Background Jobs**: Validaciones asíncronas

---

## ✅ ESTADO ACTUAL: COMPLETO Y FUNCIONAL

El módulo Cliente está **completamente implementado** con:
- ✅ Modelos robustos con validaciones
- ✅ Controladores con manejo de errores
- ✅ Servicios con lógica de negocio
- ✅ Sistema de onboarding completo
- ✅ Validaciones comprehensivas
- ✅ Endpoints RESTful completos
- ✅ Autorización por roles
- ✅ Documentación completa

**¡Listo para pasar al siguiente módulo!** 🎉
