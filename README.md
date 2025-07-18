# API OnboardingDigital Backend

## Descripción
API REST para el sistema de onboarding digital de clientes, gestión de documentos y solicitudes de productos financieros.

## Arquitectura
- **Node.js** con **TypeScript**
- **Express.js** como framework web
- **Sequelize** como ORM
- **MySQL** como base de datos
- **Zod** para validación de datos
- **JWT** para autenticación
- **Multer** para subida de archivos

## Estructura de la Base de Datos

### Tablas Principales
1. **cliente** - Información de clientes (PF, PF_AE, PM)
2. **ingreso_cliente** - Información financiera de clientes
3. **documento_tipo** - Catálogo de tipos de documentos
4. **documento** - Documentos subidos por clientes
5. **solicitud** - Solicitudes de productos
6. **solicitud_producto** - Productos dentro de solicitudes
7. **usuario** - Usuarios del sistema back-office

## Endpoints de la API

### 🔐 Autenticación
```
POST /api/usuarios/login
```

### 👥 Clientes
```
GET    /api/clientes                    # Listar clientes con filtros
POST   /api/clientes                    # Crear cliente
GET    /api/clientes/:id                # Obtener cliente por ID
PUT    /api/clientes/:id                # Actualizar cliente
DELETE /api/clientes/:id                # Eliminar cliente
GET    /api/clientes/buscar/rfc/:rfc    # Buscar por RFC
POST   /api/clientes/:id/ingresos       # Registrar ingreso
GET    /api/clientes/:id/ingresos       # Obtener ingresos
```

### 📄 Documentos
```
GET    /api/documentos                  # Listar documentos
POST   /api/documentos                  # Crear documento
GET    /api/documentos/:id              # Obtener documento
PUT    /api/documentos/:id              # Actualizar documento
DELETE /api/documentos/:id              # Eliminar documento
PATCH  /api/documentos/:id/review       # Aprobar/rechazar documento
GET    /api/documentos/tipos            # Tipos de documento
GET    /api/documentos/vencidos         # Documentos vencidos
POST   /api/documentos/upload           # Subir archivo
```

### 📋 Solicitudes
```
GET    /api/solicitudes                 # Listar solicitudes
POST   /api/solicitudes                 # Crear solicitud
GET    /api/solicitudes/:id             # Obtener solicitud
PUT    /api/solicitudes/:id             # Actualizar solicitud
DELETE /api/solicitudes/:id             # Eliminar solicitud
POST   /api/solicitudes/:id/productos   # Agregar producto
PUT    /api/solicitudes/:solicitudId/productos/:productoId  # Actualizar producto
DELETE /api/solicitudes/:solicitudId/productos/:productoId  # Eliminar producto
```

### 👤 Usuarios
```
POST   /api/usuarios                    # Crear usuario (ADMIN+)
GET    /api/usuarios                    # Listar usuarios (ADMIN+)
GET    /api/usuarios/:id                # Obtener usuario (ADMIN+)
PUT    /api/usuarios/:id                # Actualizar usuario (ADMIN+)
DELETE /api/usuarios/:id                # Suspender usuario (SUPER)
GET    /api/usuarios/profile            # Perfil actual
PATCH  /api/usuarios/:id/change-password # Cambiar contraseña
```

## Tipos de Usuario y Permisos

### Roles
- **SUPER** - Acceso total al sistema
- **ADMIN** - Gestión de usuarios y operaciones
- **AUDITOR** - Solo lectura
- **OPERADOR** - Operaciones básicas

### Permisos por Rol
- **SUPER**: create, read, update, delete, admin
- **ADMIN**: create, read, update, delete
- **AUDITOR**: read
- **OPERADOR**: read, update

## Variables de Entorno Requeridas

```env
# Base de datos
DB_HOST=localhost
DB_USER=your_user
DB_PASS=your_password
DB_NAME=your_database
DB_PORT=3306

# JWT
JWT_SECRET=your-secret-key

# Google Cloud Storage
GOOGLE_APPLICATION_CREDENTIALS=path/to/keyfile.json
GOOGLE_BUCKET_NAME=your-bucket
GOOGLE_PROJECT_ID=your-project

# Servidor
PORT=3000
NODE_ENV=development

# Archivos
MAX_FILE_SIZE=5242880
```

## Instalación y Configuración

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd backend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores
```

4. **Configurar base de datos**
```bash
# Crear la base de datos MySQL
# Ejecutar el script SQL para crear las tablas
```

5. **Iniciar en desarrollo**
```bash
npm run dev
```

6. **Construir para producción**
```bash
npm run build
npm start
```

## Scripts Disponibles

- `npm run dev` - Desarrollo con hot reload
- `npm run build` - Construir para producción
- `npm start` - Iniciar en producción
- `npm test` - Ejecutar tests
- `npm run test:fast` - Tests rápidos con Vitest

## Validaciones de Negocio

### Cliente
- RFC único y formato válido
- Correo único y formato válido
- Datos obligatorios según tipo de persona:
  - **PF/PF_AE**: nombre, apellido_paterno
  - **PM**: razon_social

### Documento
- Tipo de documento debe aplicar al tipo de persona
- Un solo documento por tipo por cliente
- Validación de formato y tamaño de archivo
- Cálculo automático de fecha de expiración

### Solicitud
- Solo se puede modificar en estado 'iniciada'
- Validación de montos y plazos por producto
- Al menos un producto por solicitud

## Códigos de Estado HTTP

- `200` - Operación exitosa
- `201` - Recurso creado
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - Sin permisos
- `404` - Recurso no encontrado
- `409` - Conflicto (ej. RFC duplicado)
- `500` - Error interno del servidor

## Estructura de Respuestas

### Éxito
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { ... }
}
```

### Error
```json
{
  "success": false,
  "message": "Descripción del error",
  "errors": [
    {
      "field": "campo",
      "message": "mensaje específico"
    }
  ]
}
```

## Contacto y Soporte

Para preguntas técnicas o soporte, contactar al equipo de desarrollo.
