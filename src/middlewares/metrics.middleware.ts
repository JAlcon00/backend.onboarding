import { Request, Response, NextFunction } from 'express';
import { logInfo, logError } from '../config/logger';

interface RequestMetrics {
  startTime: number;
  ip: string;
  userAgent: string;
  method: string;
  url: string;
  statusCode?: number;
  duration?: number;
  error?: string;
}

// Middleware para métricas de rendimiento
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  const metrics: RequestMetrics = {
    startTime,
    ip,
    userAgent,
    method: req.method,
    url: req.originalUrl || req.url,
  };

  // Log de inicio de request
  logInfo('Request iniciado', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip,
    userAgent: userAgent.substring(0, 100), // Limitar longitud
  });

  // Interceptar la respuesta
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    metrics.duration = duration;
    metrics.statusCode = res.statusCode;

    // Log de finalización de request
    logInfo('Request completado', {
      method: metrics.method,
      url: metrics.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: metrics.ip,
      size: data ? Buffer.byteLength(data, 'utf8') : 0,
    });

    // Detectar requests lentos (>2 segundos)
    if (duration > 2000) {
      logError('Request lento detectado', new Error(`Request lento: ${metrics.method} ${metrics.url} - ${duration}ms`));
    }

    return originalSend.call(this, data);
  };

  next();
};

// Middleware para rastreo de errores
export const errorTrackingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  const duration = Date.now() - (req as any).startTime;
  
  const errorInfo = new Error(`${err.message} - ${req.method} ${req.originalUrl || req.url}`);
  errorInfo.stack = err.stack;
  
  logError('Error en request', errorInfo);

  next(err);
};

// Funciones para métricas de negocio
export const logBusinessMetric = (metric: string, value: number | string, metadata?: Record<string, any>): void => {
  logInfo(`[METRIC] ${metric}`, {
    metric,
    value,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

export const logUserAction = (action: string, userId: string, metadata?: Record<string, any>): void => {
  logInfo(`[USER_ACTION] ${action}`, {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

export const logSystemEvent = (event: string, level: 'info' | 'warning' | 'error', metadata?: Record<string, any>): void => {
  const message = `[SYSTEM] ${event}`;
  
  if (level === 'error') {
    const error = new Error(message);
    logError(message, error);
  } else {
    logInfo(message, {
      event,
      level,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
};
