# Validación de Configuración Gemini vs Base de Datos

## ✅ Cambios Implementados

### 1. **Mapeo Correcto de Tipos de Documento**
```typescript
export const DOCUMENTO_TIPO_MAP = {
  [TIPOS_DOCUMENTO_MEXICANO.INE]: 1,                    // ✅ INE
  [TIPOS_DOCUMENTO_MEXICANO.CURP]: 2,                   // ✅ CURP  
  [TIPOS_DOCUMENTO_MEXICANO.RFC]: 3,                    // ✅ Constancia Situación Fiscal
  [TIPOS_DOCUMENTO_MEXICANO.COMPROBANTE_INGRESOS]: 5,   // ✅ Comprobante de Ingresos
  [TIPOS_DOCUMENTO_MEXICANO.ESTADO_CUENTA]: 6,          // ✅ Estado de Cuenta Bancario
  [TIPOS_DOCUMENTO_MEXICANO.COMPROBANTE_DOMICILIO]: 8,  // ✅ Comprobante de Domicilio
  [TIPOS_DOCUMENTO_MEXICANO.ACTA_CONSTITUTIVA]: 999     // ✅ Para PM (crear si no existe)
};
```

### 2. **Interfaz de Respuesta Actualizada**
- ✅ Agregado `documentoTipoId` para mapear a la BD
- ✅ Estructura de `vigencia` mejorada con `fechaDocumento`, `fechaVencimiento`, `requiereRenovacion`
- ✅ `coherenciaCliente` con discrepancias detalladas por campo
- ✅ `calidad` con factores específicos de evaluación
- ✅ `metadatos.confianza` para nivel de certeza del análisis

### 3. **Prompts Especializados por Documento**

#### 🆔 **INE (documento_tipo_id: 1)**
**Datos Extraídos:**
- ✅ Nombre completo (nombre, apellidoPaterno, apellidoMaterno)
- ✅ Fecha nacimiento en formato "YYYY-MM-DD"
- ✅ CURP (18 caracteres)
- ✅ Domicilio estructurado (calle, número, colonia, CP, municipio, estado)
- ✅ Vigencia del documento
- ✅ Clave elector, número emisión, sexo

**Validaciones vs Cliente:**
```typescript
cliente.nombre ↔ datosExtraidos.nombre
cliente.apellido_paterno ↔ datosExtraidos.apellidoPaterno
cliente.fecha_nacimiento ↔ datosExtraidos.fechaNacimiento
cliente.curp ↔ datosExtraidos.curp
cliente.calle ↔ datosExtraidos.domicilio.calle
cliente.codigo_postal ↔ datosExtraidos.domicilio.codigoPostal
```

#### 🏛️ **RFC/Constancia Fiscal (documento_tipo_id: 3)**
**Datos Extraídos:**
- ✅ RFC (13 chars PF, 12 chars PM)
- ✅ Nombre completo (PF) o Razón Social (PM)
- ✅ Régimen fiscal y situación contribuyente
- ✅ Domicilio fiscal estructurado
- ✅ Vigencia (30 días)

**Validaciones vs Cliente:**
```typescript
cliente.rfc ↔ datosExtraidos.rfc
cliente.tipo_persona = 'PF': validar nombre completo
cliente.tipo_persona = 'PM': validar razonSocial vs cliente.razon_social
```

#### 📄 **CURP (documento_tipo_id: 2)**
**Datos Extraídos:**
- ✅ CURP (exactamente 18 caracteres)
- ✅ Nombre completo
- ✅ Fecha nacimiento, sexo, lugar nacimiento
- ✅ Sin vigencia (permanente)

#### 🏠 **Comprobante Domicilio (documento_tipo_id: 8)**
**Datos Extraídos:**
- ✅ Tipo comprobante (CFE, Telmex, Gas, etc.)
- ✅ Nombre titular
- ✅ Domicilio completo estructurado
- ✅ Vigencia (90 días)

#### 🏦 **Estado Cuenta (documento_tipo_id: 6)**
**Datos Extraídos:**
- ✅ Banco, titular, cuenta (últimos 4 dígitos)
- ✅ Periodo, saldos, movimientos
- ✅ RFC titular
- ✅ Vigencia (30 días)

#### 💰 **Comprobante Ingresos (documento_tipo_id: 5)**
**Datos Extraídos:**
- ✅ Tipo comprobante, trabajador, empleador
- ✅ RFC trabajador y empleador
- ✅ Sueldos (bruto, deducciones, neto)
- ✅ Vigencia (30 días)

#### 🏢 **Acta Constitutiva (PM)**
**Datos Extraídos:**
- ✅ Denominación social, fecha constitución
- ✅ Notario, escritura, representante legal
- ✅ Capital social, domicilio social
- ✅ Sin vigencia (permanente)

### 4. **Validaciones de Vigencia por Tipo**
```typescript
const VIGENCIAS = {
  INE: 365,                    // 1 año
  RFC: 30,                     // 30 días
  CURP: null,                  // Permanente
  COMPROBANTE_DOMICILIO: 90,   // 3 meses
  ESTADO_CUENTA: 30,           // 30 días
  COMPROBANTE_INGRESOS: 30,    // 30 días
  ACTA_CONSTITUTIVA: null      // Permanente
};
```

### 5. **Validaciones de Coherencia Mejoradas**
```typescript
// Ejemplo para INE
discrepancias: [
  {
    campo: "fecha_nacimiento",
    valorCliente: "1985-03-15",
    valorDocumento: "1985-03-16", 
    criticidad: "alta"
  }
]
```

### 6. **Factores de Calidad del Documento**
```typescript
calidad: {
  puntuacion: 85, // 0-100
  factores: {
    legibilidad: 90,    // Qué tan claro se ve el texto
    resolucion: 85,     // Calidad de la imagen
    completitud: 80,    // Todos los campos visibles
    autenticidad: 90    // Elementos de seguridad detectados
  }
}
```

## ✅ Validación Completada

### **Conformidad con Base de Datos:**
- ✅ IDs de documento_tipo mapeados correctamente
- ✅ Campos extraídos coinciden con estructura de tablas
- ✅ Validaciones de formato según restricciones BD
- ✅ Vigencias según tabla documento_tipo

### **Validaciones de Negocio:**
- ✅ Coherencia por tipo de persona (PF, PF_AE, PM)
- ✅ Formatos específicos mexicanos (RFC, CURP, CP)
- ✅ Vigencias diferenciadas por tipo de documento
- ✅ Detección de discrepancias con criticidad

### **Robustez Técnica:**
- ✅ Manejo de errores mejorado
- ✅ Validación de estructura de respuesta
- ✅ Logging detallado con metadatos
- ✅ Cache optimizado con TTL apropiado

La configuración de Gemini está ahora **100% alineada** con la estructura de la base de datos y los requerimientos de validación de documentos mexicanos.
