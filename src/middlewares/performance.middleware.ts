import { Request, Response, NextFunction } from 'express';
import { logInfo, logError } from '../config/logger';

// Middleware para limitar el tamaño de respuestas grandes
export const responseSizeMiddleware = (maxSizeBytes: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      try {
        const responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
        
        if (responseSize > maxSizeBytes) {
          logError('Respuesta excede el tamaño máximo permitido', new Error(`Response size: ${responseSize} bytes, max: ${maxSizeBytes} bytes`));
          
          return originalSend.call(this, {
            success: false,
            message: 'Respuesta demasiado grande',
            error: 'La respuesta excede el tamaño máximo permitido'
          });
        }
        
        // Log de respuestas grandes (mayor a 1MB)
        if (responseSize > 1024 * 1024) {
          logInfo('Respuesta grande detectada', {
            url: req.originalUrl,
            method: req.method,
            size: `${Math.round(responseSize / 1024 / 1024)}MB`
          });
        }
        
        return originalSend.call(this, data);
      } catch (error) {
        logError('Error en middleware de tamaño de respuesta', error instanceof Error ? error : new Error(String(error)));
        return originalSend.call(this, data);
      }
    };
    
    next();
  };
};

// Middleware para cleanup de memoria después de respuestas grandes
export const memoryCleanupMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;
  
  res.send = function(data: any) {
    const result = originalSend.call(this, data);
    
    // Trigger garbage collection si está disponible y la respuesta es grande
    try {
      const responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
      if (responseSize > 5 * 1024 * 1024 && global.gc && typeof global.gc === 'function') { // 5MB
        setImmediate(() => {
          if (global.gc) {
            global.gc();
            logInfo('Garbage collection ejecutado después de respuesta grande', {
              responseSize: `${Math.round(responseSize / 1024 / 1024)}MB`
            });
          }
        });
      }
    } catch (error) {
      // Silently ignore errors in memory cleanup
    }
    
    return result;
  };
  
  next();
};

// Middleware para paginación automática en respuestas grandes
export const autoPaginationMiddleware = (defaultLimit: number = 50, maxLimit: number = 200) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Solo aplicar a métodos GET
    if (req.method !== 'GET') {
      return next();
    }
    
    // Agregar parámetros de paginación si no existen
    if (!req.query.page) {
      req.query.page = '1';
    }
    
    if (!req.query.limit) {
      req.query.limit = defaultLimit.toString();
    } else {
      const requestedLimit = parseInt(req.query.limit as string);
      if (requestedLimit > maxLimit) {
        req.query.limit = maxLimit.toString();
        logInfo('Límite de paginación ajustado', {
          requested: requestedLimit,
          applied: maxLimit,
          url: req.originalUrl
        });
      }
    }
    
    next();
  };
};
