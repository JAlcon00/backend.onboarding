import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import fs from 'fs';
import path from 'path';

// Interface para errores personalizados
interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  field?: string;
  value?: any;
}

// Función para log de errores a archivo
const logErrorToFile = (error: CustomError, req: Request) => {
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'error.log');
  
  // Crear directorio de logs si no existe
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
  };
  
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
};

// Middleware para manejo de errores global
export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Error interno del servidor';
  let details: any = {};

  // Log del error en consola
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });

  // Log del error a archivo en producción
  if (process.env.NODE_ENV === 'production') {
    try {
      logErrorToFile(error, req);
    } catch (logError) {
      console.error('Error al escribir log:', logError);
    }
  }

  // Errores de Zod (validación)
  if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Datos de entrada inválidos';
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    details = { validationErrors };
  }

  // Errores de Sequelize
  else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Error de validación de datos';
    details = { sequelizeErrors: (error as any).errors };
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'El registro ya existe';
    details = { 
      field: (error as any).fields,
      value: (error as any).value 
    };
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Referencia inválida a otro registro';
    details = { 
      table: (error as any).table,
      field: (error as any).field 
    };
  } else if (error.name === 'SequelizeConnectionError') {
    statusCode = 500;
    message = 'Error de conexión a la base de datos';
  } else if (error.name === 'SequelizeTimeoutError') {
    statusCode = 408;
    message = 'Timeout en la consulta a la base de datos';
  }

  // Errores de JWT
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  } else if (error.name === 'NotBeforeError') {
    statusCode = 401;
    message = 'Token no válido aún';
  }

  // Errores de Multer
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'El archivo es demasiado grande';
  } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Archivo inesperado';
  } else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Demasiados archivos';
  }

  // Errores de sintaxis JSON
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'JSON malformado';
  }

  // Errores de base de datos específicos
  else if (error.code === 'ECONNREFUSED') {
    statusCode = 500;
    message = 'No se puede conectar a la base de datos';
  } else if (error.code === 'ENOTFOUND') {
    statusCode = 500;
    message = 'Host de base de datos no encontrado';
  }

  // En producción, no enviar información sensible
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response: any = {
    success: false,
    message,
    error: {
      type: error.name,
      code: error.code,
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  };

  // Agregar detalles solo si existen
  if (Object.keys(details).length > 0) {
    response.details = details;
  }

  // Agregar stack trace solo en desarrollo
  if (isDevelopment) {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

// Middleware para rutas no encontradas
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.path} no encontrada`,
    timestamp: new Date().toISOString(),
    availableRoutes: {
      '/api/clientes': 'Gestión de clientes',
      '/api/documentos': 'Gestión de documentos',
      '/api/solicitudes': 'Gestión de solicitudes',
      '/api/usuarios': 'Gestión de usuarios',
      '/health': 'Estado del servidor',
    },
  });
};

// Wrapper para async handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware para validar request ID
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Middleware para timeout de requests
export const timeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          timestamp: new Date().toISOString(),
        });
      }
    }, timeout);

    // Limpiar timeout cuando la respuesta termine
    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};
