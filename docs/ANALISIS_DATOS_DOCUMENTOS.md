# Análisis de Datos Requeridos para Validación de Documentos

## Estructura de Base de Datos Actual

### Tabla `cliente`
```sql
- cliente_id: BIGINT UNSIGNED (PK)
- tipo_persona: ENUM('PF', 'PF_AE', 'PM') NOT NULL
- nombre: VARCHAR(255) NULL
- apellido_paterno: VARCHAR(255) NULL  
- apellido_materno: VARCHAR(255) NULL
- razon_social: VARCHAR(255) NULL
- representante_legal: VARCHAR(255) NULL
- rfc: CHAR(13) NOT NULL UNIQUE
- curp: CHAR(18) NULL
- fecha_nacimiento: DATE NULL
- fecha_constitucion: DATE NULL
- correo: VARCHAR(255) NOT NULL UNIQUE
- telefono: VARCHAR(15) NULL
- calle: VARCHAR(255) NULL
- numero_exterior: VARCHAR(10) NULL
- numero_interior: VARCHAR(10) NULL
- colonia: VARCHAR(255) NULL
- codigo_postal: CHAR(5) NULL
- ciudad: VARCHAR(100) NULL
- estado: VARCHAR(100) NULL
- pais: VARCHAR(100) NOT NULL DEFAULT 'México'
```

### Tabla `documento`
```sql
- documento_id: BIGINT UNSIGNED (PK)
- cliente_id: BIGINT UNSIGNED NOT NULL (FK)
- documento_tipo_id: TINYINT UNSIGNED NOT NULL (FK)
- archivo_url: VARCHAR(1000) NOT NULL
- fecha_documento: DATE NOT NULL
- fecha_subida: DATETIME NOT NULL DEFAULT NOW()
- fecha_expiracion: DATE NULL
- estatus: ENUM('pendiente', 'aceptado', 'rechazado', 'vencido') NOT NULL DEFAULT 'pendiente'
- comentario_revisor: VARCHAR(500) NULL
```

### Tabla `documento_tipo`
```sql
- documento_tipo_id: TINYINT UNSIGNED (PK)
- nombre: VARCHAR(100) NOT NULL UNIQUE
- aplica_pf: BOOLEAN NOT NULL DEFAULT FALSE
- aplica_pfae: BOOLEAN NOT NULL DEFAULT FALSE
- aplica_pm: BOOLEAN NOT NULL DEFAULT FALSE
- vigencia_dias: SMALLINT UNSIGNED NULL
- opcional: BOOLEAN NOT NULL DEFAULT FALSE
```

## Mapeo de Tipos de Documento de Gemini a Base de Datos

### 1. INE/IFE → `documento_tipo_id: 1`
**Campos del Cliente a Validar:**
- `nombre` ↔ nombre extraído del INE
- `apellido_paterno` ↔ apellido paterno extraído
- `apellido_materno` ↔ apellido materno extraído
- `fecha_nacimiento` ↔ fecha de nacimiento extraída
- `curp` ↔ CURP extraída del INE
- `calle`, `numero_exterior`, `colonia`, `codigo_postal`, `ciudad`, `estado` ↔ domicilio extraído

**Datos a Extraer del Documento:**
```typescript
interface DatosINE {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string; // "YYYY-MM-DD"
  claveElector: string;
  curp: string;
  domicilio: {
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    municipio: string;
    estado: string;
  };
  vigencia: string; // "YYYY-MM-DD"
  numeroEmision: string;
  sexo: "H" | "M";
  lugarNacimiento: string;
}
```

### 2. RFC → `documento_tipo_id: 3` (Constancia de Situación Fiscal)
**Campos del Cliente a Validar:**
- `rfc` ↔ RFC extraído
- `nombre` + `apellido_paterno` + `apellido_materno` ↔ nombre fiscal (PF)
- `razon_social` ↔ razón social (PM)
- `calle`, `numero_exterior`, `colonia`, `codigo_postal`, `ciudad`, `estado` ↔ domicilio fiscal

**Datos a Extraer:**
```typescript
interface DatosRFC {
  rfc: string; // XXXX000000XXX
  nombre: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  razonSocial?: string;
  regimenFiscal: string;
  fechaInicioOperaciones: string; // "YYYY-MM-DD"
  domicilioFiscal: {
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    municipio: string;
    estado: string;
  };
  situacionContribuyente: string; // "Activo", "Suspendido", etc.
  fechaEmision: string;
}
```

### 3. CURP → `documento_tipo_id: 2`
**Campos del Cliente a Validar:**
- `curp` ↔ CURP extraída
- `nombre` + `apellido_paterno` + `apellido_materno` ↔ nombre completo
- `fecha_nacimiento` ↔ fecha de nacimiento

**Datos a Extraer:**
```typescript
interface DatosCURP {
  curp: string; // 18 caracteres
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string; // "YYYY-MM-DD"
  sexo: "H" | "M";
  lugarNacimiento: string;
  fechaRegistro: string;
  folio: string;
}
```

### 4. Comprobante de Domicilio → `documento_tipo_id: 8`
**Campos del Cliente a Validar:**
- `nombre` + `apellido_paterno` + `apellido_materno` ↔ titular del servicio
- `calle`, `numero_exterior`, `numero_interior`, `colonia`, `codigo_postal`, `ciudad`, `estado` ↔ domicilio

**Datos a Extraer:**
```typescript
interface DatosComprobanteDomicilio {
  tipoComprobante: string; // "CFE", "Telmex", "Gas Natural", "Agua", etc.
  nombreTitular: string;
  domicilio: {
    calle: string;
    numeroExterior: string;
    numeroInterior?: string;
    colonia: string;
    codigoPostal: string;
    municipio: string;
    estado: string;
  };
  fechaEmision: string; // "YYYY-MM-DD"
  periodoFacturacion: string;
  numeroServicio: string;
  monto: number;
  fechaVencimiento?: string;
}
```

### 5. Estado de Cuenta Bancario → `documento_tipo_id: 6`
**Campos del Cliente a Validar:**
- `nombre` + `apellido_paterno` + `apellido_materno` ↔ titular de la cuenta
- `rfc` ↔ RFC del titular

**Datos a Extraer:**
```typescript
interface DatosEstadoCuenta {
  banco: string;
  titular: string;
  numeroCuenta: string; // Solo últimos 4 dígitos por seguridad
  periodo: string; // "YYYY-MM"
  fechaEmision: string;
  saldoInicial: number;
  saldoFinal: number;
  saldoPromedio: number;
  ingresos: number;
  egresos: number;
  numeroMovimientos: number;
  rfcTitular?: string;
}
```

### 6. Comprobante de Ingresos → `documento_tipo_id: 5`
**Campos del Cliente a Validar:**
- `nombre` + `apellido_paterno` + `apellido_materno` ↔ empleado/titular
- `rfc` ↔ RFC del trabajador

**Datos a Extraer:**
```typescript
interface DatosComprobanteIngresos {
  tipoComprobante: string; // "Nómina", "Honorarios", "Pensión", etc.
  nombreTrabajador: string;
  rfcTrabajador: string;
  empleador: string;
  rfcEmpleador?: string;
  periodo: string; // "YYYY-MM"
  fechaEmision: string;
  sueldoBruto: number;
  deducciones: number;
  sueldoNeto: number;
  puesto?: string;
  antiguedad?: string;
}
```

### 7. Acta Constitutiva → Para `tipo_persona: 'PM'`
**Campos del Cliente a Validar:**
- `razon_social` ↔ denominación social
- `representante_legal` ↔ representante legal
- `fecha_constitucion` ↔ fecha de constitución
- `rfc` ↔ RFC de la empresa

**Datos a Extraer:**
```typescript
interface DatosActaConstitutiva {
  denominacionSocial: string;
  fechaConstitucion: string; // "YYYY-MM-DD"
  notario: string;
  numeroEscritura: string;
  fechaEscritura: string;
  representanteLegal: string;
  objetoSocial: string;
  capitalSocial: number;
  monedaCapital: string;
  domicilioSocial: {
    calle: string;
    numero: string;
    colonia: string;
    codigoPostal: string;
    municipio: string;
    estado: string;
  };
  duracionSociedad: string;
  rfc?: string;
}
```

## Validaciones de Coherencia por Tipo de Persona

### Persona Física (PF)
```typescript
interface ValidacionesPF {
  // Campos obligatorios
  nombre: string;
  apellido_paterno: string;
  rfc: string; // 13 caracteres, formato PF
  fecha_nacimiento: Date;
  curp: string; // 18 caracteres
  correo: string;
  
  // Validaciones de coherencia
  rfcCoherenteConNombre: boolean;
  curpCoherenteConNombre: boolean;
  fechaNacimientoCoherente: boolean;
  domicilioCoherente: boolean;
}
```

### Persona Física con Actividad Empresarial (PF_AE)
```typescript
interface ValidacionesPF_AE extends ValidacionesPF {
  // Adicionales para actividad empresarial
  constanciaSituacionFiscal: boolean;
  regimenFiscalApropiado: boolean;
  comprobanteIngresos: boolean;
}
```

### Persona Moral (PM)
```typescript
interface ValidacionesPM {
  // Campos obligatorios
  razon_social: string;
  representante_legal: string;
  rfc: string; // 12 caracteres, formato PM
  fecha_constitucion: Date;
  correo: string;
  
  // Validaciones específicas
  actaConstitutiva: boolean;
  poderRepresentante: boolean;
  rfcFormatoPM: boolean;
  vigenciaDocumentos: boolean;
}
```

## Configuración de Vigencias por Tipo de Documento

```typescript
interface VigenciaDocumento {
  documentoTipoId: number;
  nombre: string;
  vigenciaDias: number | null; // null = no caduca
  renovacionPorSolicitud: boolean;
}

const VIGENCIAS_DOCUMENTOS: VigenciaDocumento[] = [
  { documentoTipoId: 1, nombre: "INE", vigenciaDias: 365, renovacionPorSolicitud: false },
  { documentoTipoId: 2, nombre: "CURP", vigenciaDias: null, renovacionPorSolicitud: false },
  { documentoTipoId: 3, nombre: "Constancia Situación Fiscal", vigenciaDias: 30, renovacionPorSolicitud: true },
  { documentoTipoId: 4, nombre: "eFirma (FIEL)", vigenciaDias: null, renovacionPorSolicitud: false },
  { documentoTipoId: 5, nombre: "Comprobante de Ingresos", vigenciaDias: 30, renovacionPorSolicitud: true },
  { documentoTipoId: 6, nombre: "Estado de Cuenta Bancario", vigenciaDias: 30, renovacionPorSolicitud: true },
  { documentoTipoId: 7, nombre: "Acta de Nacimiento", vigenciaDias: null, renovacionPorSolicitud: false },
  { documentoTipoId: 8, nombre: "Comprobante de Domicilio", vigenciaDias: 90, renovacionPorSolicitud: false }
];
```

## Estructura de Respuesta de Validación Unificada

```typescript
interface ValidacionDocumento {
  // Información básica
  esValido: boolean;
  documentoTipoId: number;
  nombreTipoDocumento: string;
  
  // Vigencia
  vigencia: {
    esVigente: boolean;
    fechaDocumento: string;
    fechaVencimiento: string | null;
    diasRestantes: number | null;
    requiereRenovacion: boolean;
  };
  
  // Datos extraídos (específicos por tipo)
  datosExtraidos: any; // Una de las interfaces específicas arriba
  
  // Coherencia con datos del cliente
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
  
  // Calidad del documento
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
  
  // Metadatos del procesamiento
  metadatos: {
    timestamp: string;
    tiempoAnalisis: number;
    modeloIA: string;
    version: string;
    confianza: number; // 0-100
  };
}
```

Este análisis asegura que los datos extraídos por Gemini coincidan exactamente con la estructura de la base de datos y permitan validaciones precisas de coherencia con los datos del cliente.
