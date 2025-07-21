// =================================
// CLASES DE ERROR PERSONALIZADAS
// =================================

import { logError } from '../config/logger';

// Error base para la aplicación
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  abstract readonly errorCode: string;

  constructor(message: string, public context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    
    // Capturar stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  // Método para logging que accede a las propiedades después de la construcción
  protected logError(): void {
    logError(this.message, this, { 
      errorCode: this.errorCode,
      statusCode: this.statusCode,
      ...this.context 
    });
  }
}

// Errores de validación (400)
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(message: string, public fields?: Record<string, string>) {
    super(message, { fields });
    this.logError();
  }
}

// Errores de autenticación (401)
export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;
  readonly errorCode = 'AUTHENTICATION_ERROR';

  constructor(message = 'No autorizado') {
    super(message);
    this.logError();
  }
}

// Errores de autorización (403)
export class AuthorizationError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;
  readonly errorCode = 'AUTHORIZATION_ERROR';

  constructor(message = 'Acceso denegado') {
    super(message);
    this.logError();
  }
}

// Errores de recurso no encontrado (404)
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
  readonly errorCode = 'NOT_FOUND_ERROR';

  constructor(resource: string, identifier?: string | number) {
    const message = identifier 
      ? `${resource} con ID '${identifier}' no encontrado`
      : `${resource} no encontrado`;
    super(message, { resource, identifier });
    this.logError();
  }
}

// Errores de conflicto/duplicados (409)
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;
  readonly errorCode = 'CONFLICT_ERROR';

  constructor(message: string, conflictField?: string) {
    super(message, { conflictField });
    this.logError();
  }
}

// Errores de negocio (422)
export class BusinessLogicError extends AppError {
  readonly statusCode = 422;
  readonly isOperational = true;
  readonly errorCode = 'BUSINESS_LOGIC_ERROR';

  constructor(message: string, rule?: string) {
    super(message, { rule });
    this.logError();
  }
}

// Errores de rate limiting (429)
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;
  readonly errorCode = 'RATE_LIMIT_ERROR';

  constructor(message = 'Demasiadas solicitudes', retryAfter?: number) {
    super(message, { retryAfter });
    this.logError();
  }
}

// Errores internos del servidor (500)
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';

  constructor(message = 'Error interno del servidor', originalError?: Error) {
    super(message, { originalError: originalError?.message });
    this.logError();
  }
}

// Errores de base de datos
export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly isOperational = false;
  readonly errorCode = 'DATABASE_ERROR';

  constructor(message: string, operation?: string) {
    super(message, { operation });
    this.logError();
  }
}

// Errores de servicios externos
export class ExternalServiceError extends AppError {
  readonly statusCode = 502;
  readonly isOperational = true;
  readonly errorCode = 'EXTERNAL_SERVICE_ERROR';

  constructor(serviceName: string, message?: string) {
    super(message || `Error en servicio externo: ${serviceName}`, { serviceName });
    this.logError();
  }
}

// Función helper para crear errores comunes
export class ErrorFactory {
  static clienteNotFound(id?: string | number) {
    return new NotFoundError('Cliente', id);
  }

  static clienteAlreadyExists(field: 'RFC' | 'email', value: string) {
    return new ConflictError(`Ya existe un cliente con este ${field}: ${value}`, field);
  }

  static documentoNotFound(id?: string | number) {
    return new NotFoundError('Documento', id);
  }

  static solicitudNotFound(id?: string | number) {
    return new NotFoundError('Solicitud', id);
  }

  static invalidStatusTransition(from: string, to: string) {
    return new BusinessLogicError(`Transición de estatus no válida: ${from} -> ${to}`, 'status_transition');
  }

  static documentoExpired(fechaVencimiento: Date) {
    return new BusinessLogicError(`Documento vencido desde ${fechaVencimiento.toLocaleDateString()}`, 'document_expired');
  }

  static invalidFileType(allowedTypes: string[]) {
    return new ValidationError(`Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`, { allowedTypes: allowedTypes.join(', ') });
  }

  static fileSizeExceeded(maxSize: number) {
    return new ValidationError(`Tamaño de archivo excede el límite de ${maxSize} MB`, { maxSize: maxSize.toString() });
  }
}

// Función para determinar si un error es operacional
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
