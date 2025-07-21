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

// Formato personalizado para desarrollo
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Formato para producción
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
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
