import rateLimit from 'express-rate-limit';
import { logInfo, logError } from '../config/logger';
import { Request, Response } from 'express';

// Store para rastrear intentos fallidos por usuario
const failedAttempts = new Map<string, { count: number; lastAttempt: number; blockedUntil?: number }>();

// Función para limpiar intentos antiguos
function cleanupOldAttempts(): void {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 24 * 60 * 60 * 1000; // 24 horas
  
  for (const [key, attempt] of failedAttempts.entries()) {
    if (now - attempt.lastAttempt > CLEANUP_THRESHOLD) {
      failedAttempts.delete(key);
    }
  }
}

// Limpiar intentos antiguos cada hora
setInterval(cleanupOldAttempts, 60 * 60 * 1000);

// Rate limiter avanzado para autenticación con backoff exponencial
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Solo 5 intentos por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Cuenta temporalmente bloqueada.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Permitir si es un endpoint de health check
    return req.path === '/health';
  },
  // Usar handler en lugar de onLimitReached para compatibilidad
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    logError(`Rate limit alcanzado para autenticación desde IP: ${ip}`, new Error('Rate limit exceeded'));
    
    res.status(429).json({
      success: false,
      message: 'Demasiados intentos de autenticación. Intenta nuevamente en 15 minutos.',
      retryAfter: '15 minutos'
    });
  }
});

// Rate limiter específico por usuario para login
export const userAuthLimiter = (req: Request, res: Response, next: any) => {
  const identifier = req.body?.email || req.body?.username || req.ip;
  
  if (!identifier) {
    return next();
  }

  const now = Date.now();
  const attempt = failedAttempts.get(identifier);

  // Si está bloqueado, verificar si ya pasó el tiempo
  if (attempt?.blockedUntil && now < attempt.blockedUntil) {
    const remainingMinutes = Math.ceil((attempt.blockedUntil - now) / (60 * 1000));
    return res.status(429).json({
      success: false,
      message: `Cuenta bloqueada temporalmente. Intente nuevamente en ${remainingMinutes} minutos.`,
      blockedUntil: new Date(attempt.blockedUntil).toISOString()
    });
  }

  // Si no está bloqueado o ya expiró el bloqueo, continuar
  next();
};

// Middleware para manejar intentos fallidos de autenticación
export const handleFailedAuth = (req: Request, res: Response, next: any) => {
  const identifier = req.body?.email || req.body?.username || req.ip;
  
  if (!identifier) {
    return next();
  }

  const now = Date.now();
  let attempt = failedAttempts.get(identifier) || { count: 0, lastAttempt: now };

  // Incrementar contador de intentos fallidos
  attempt.count += 1;
  attempt.lastAttempt = now;

  // Calcular tiempo de bloqueo con backoff exponencial
  if (attempt.count >= 3) {
    const blockTimeMinutes = Math.min(Math.pow(2, attempt.count - 3) * 5, 120); // Max 2 horas
    attempt.blockedUntil = now + (blockTimeMinutes * 60 * 1000);
    
    logError(`Usuario/IP bloqueado por ${blockTimeMinutes} minutos después de ${attempt.count} intentos fallidos`, new Error('Too many failed attempts'), {
      identifier,
      attempts: attempt.count,
      blockTimeMinutes
    });
  }

  failedAttempts.set(identifier, attempt);
  next();
};

// Middleware para limpiar intentos exitosos
export const handleSuccessfulAuth = (req: Request, res: Response, next: any) => {
  const identifier = req.body?.email || req.body?.username || req.ip;
  
  if (identifier && failedAttempts.has(identifier)) {
    failedAttempts.delete(identifier);
    logInfo('Intentos fallidos limpiados después de autenticación exitosa', { identifier });
  }
  
  next();
};

// Rate limiter para operaciones de escritura (POST, PUT, DELETE)
export const writeOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 operaciones de escritura por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiadas operaciones de escritura. Intente de nuevo más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // No contar requests exitosos
});

// Rate limiter para operaciones de lectura (GET)
export const readOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 operaciones de lectura por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiadas consultas. Intente de nuevo más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter específico para uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // 50 uploads por IP cada hora
  message: {
    success: false,
    message: 'Demasiados uploads. Intente de nuevo más tarde.',
    retryAfter: '1 hora'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter específico para health checks
export const healthCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60, // 60 health checks por IP cada minuto (1 por segundo)
  message: {
    success: false,
    message: 'Demasiados health checks. Intente de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter dinámico basado en el endpoint
export const createDynamicRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: `${Math.round(windowMs / 60000)} minutos`
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};
