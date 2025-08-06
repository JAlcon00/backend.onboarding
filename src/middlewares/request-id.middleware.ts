import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logInfo } from '../config/logger';

// Extender los tipos de Express para incluir requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Middleware para correlación de logs
 * Genera o utiliza x-request-id para rastrear requests de punta a punta
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Obtener x-request-id del header o generar uno nuevo
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  
  // Asignar el requestId al request
  req.requestId = requestId;
  
  // Establecer el header en la respuesta para que el cliente pueda usarlo
  res.setHeader('x-request-id', requestId);
  
  // Log del inicio del request con información básica
  logInfo('Request iniciado', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    referer: req.headers.referer
  });
  
  // Sobrescribir el método end de la respuesta para capturar la finalización
  const originalEnd = res.end.bind(res);
  const startTime = Date.now();
  
  res.end = function(...args: any[]) {
    const duration = Date.now() - startTime;
    
    logInfo('Request completado', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length') || 0
    });
    
    // Llamar al método original
    return originalEnd(...args);
  };
  
  next();
};

/**
 * Función helper para obtener el requestId del contexto actual
 */
export const getCurrentRequestId = (req?: Request): string | undefined => {
  return req?.requestId;
};

/**
 * Función helper para crear logs con contexto de request
 */
export const logWithContext = (
  level: 'info' | 'error' | 'warn' | 'debug',
  message: string,
  req?: Request,
  additionalData?: Record<string, any>
) => {
  const contextData = {
    ...additionalData,
    requestId: req?.requestId,
    userAgent: req?.headers['user-agent'],
    ip: req?.ip || req?.connection.remoteAddress
  };
  
  // Filtrar valores undefined
  const cleanContextData = Object.fromEntries(
    Object.entries(contextData).filter(([_, value]) => value !== undefined)
  );
  
  switch (level) {
    case 'info':
      logInfo(message, cleanContextData);
      break;
    case 'error':
      // El logError ya maneja objetos Error, así que pasamos el additionalData como contexto
      logInfo(message, cleanContextData);
      break;
    case 'warn':
      logInfo(`[WARN] ${message}`, cleanContextData);
      break;
    case 'debug':
      logInfo(`[DEBUG] ${message}`, cleanContextData);
      break;
  }
};

/**
 * Middleware para capturar errores con contexto de request
 */
export const errorContextMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logWithContext('error', 'Error no manejado', req, {
    error: error.message,
    stack: error.stack,
    statusCode: res.statusCode
  });
  
  next(error);
};
