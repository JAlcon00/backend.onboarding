import rateLimit from 'express-rate-limit';
import { logInfo, logError } from '../config/logger';

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
  legacyHeaders: false
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

// Rate limiter para autenticación
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos de login por IP cada 15 minutos
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación. Intente de nuevo más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // No contar requests exitosos
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
