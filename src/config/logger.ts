import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from './env';

// Configuración de niveles de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colores para cada nivel
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Campos sensibles que deben ser scrubbed
const PII_FIELDS = [
  'password', 'pwd', 'pass', 'secret', 'token', 'jwt', 'authorization',
  'creditCard', 'credit_card', 'ssn', 'social_security', 'email', 'phone',
  'address', 'ip', 'userAgent', 'user_agent', 'curp', 'rfc'
];

/**
 * Función para sanitizar datos sensibles (PII)
 */
const scrubPII = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Verificar si la cadena contiene patrones sensibles
    if (/password|token|secret|jwt/i.test(obj)) {
      return '[REDACTED]';
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => scrubPII(item));
  }
  
  if (typeof obj === 'object') {
    const scrubbed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      if (PII_FIELDS.some(field => lowerKey.includes(field))) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrubPII(value);
      }
    }
    return scrubbed;
  }
  
  return obj;
};

// Formato personalizado para desarrollo
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;
    if (info.requestId) {
      message += ` [ReqID: ${info.requestId}]`;
    }
    
    // Crear un objeto con datos adicionales sin las propiedades básicas
    const basicKeys = ['timestamp', 'level', 'message', 'requestId'];
    const additionalKeys = Object.keys(info).filter(key => !basicKeys.includes(key));
    
    if (additionalKeys.length > 0) {
      const additionalData: any = {};
      additionalKeys.forEach(key => {
        additionalData[key] = (info as any)[key];
      });
      message += `\n${JSON.stringify(scrubPII(additionalData), null, 2)}`;
    }
    return message;
  })
);

// Formato para producción con scrubbing de PII
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const scrubbed = scrubPII({
      ...info,
      environment: env.NODE_ENV,
      service: 'onboarding-backend',
      version: process.env.npm_package_version || '1.0.0'
    });
    return JSON.stringify(scrubbed);
  })
);

// Configuración de transports
const transports = [];

// Console transport para desarrollo
if (env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: devFormat,
    })
  );
}

// File transports para producción
if (env.NODE_ENV === 'production') {
  // Archivo para errores
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: prodFormat,
      maxSize: '20m',
      maxFiles: '30d',
    })
  );

  // Archivo para todos los logs
  transports.push(
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      format: prodFormat,
      maxSize: '20m',
      maxFiles: '30d',
    })
  );
}

// Console transport para producción (solo errores)
if (env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'error',
      format: winston.format.simple(),
    })
  );
}

// Crear logger
const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format: env.NODE_ENV === 'development' ? devFormat : prodFormat,
  transports,
  exitOnError: false,
});

// Crear stream para Morgan
const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Funciones de logging con contexto
export const logError = (message: string, error?: Error, context?: any) => {
  const logData = {
    message,
    error: error?.message,
    stack: error?.stack,
    context,
    timestamp: new Date().toISOString(),
  };
  
  logger.error(logData);
};

export const logInfo = (message: string, context?: any) => {
  logger.info({ message, context, timestamp: new Date().toISOString() });
};

export const logWarning = (message: string, context?: any) => {
  logger.warn({ message, context, timestamp: new Date().toISOString() });
};

export const logDebug = (message: string, context?: any) => {
  logger.debug({ message, context, timestamp: new Date().toISOString() });
};

export const logHttp = (message: string, context?: any) => {
  logger.http({ message, context, timestamp: new Date().toISOString() });
};

export { logger, stream };
export default logger;
