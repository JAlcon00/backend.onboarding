import app from './app';
import { env } from './config/env';
import { logInfo, logError, logWarning } from './config/logger';
import { Server } from 'http';
import { inicializarJobsDocumentos } from './jobs/documentos.job';
const { testDbConnection } = require('./config/database');

const PORT = env.PORT || 3001;
let server: Server;

// Función para iniciar el servidor
async function startServer() {
  try {
    // Probar conexión a la base de datos
    await testDbConnection();
    logInfo('Conexión a la base de datos establecida');

    // Inicializar jobs
    inicializarJobsDocumentos();

    // Iniciar servidor
    server = app.listen(PORT, () => {
      logInfo(`Servidor corriendo en puerto ${PORT}`);
      logInfo(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logInfo(`URL: http://localhost:${PORT}`);
      logInfo(`Health check: http://localhost:${PORT}/health`);
    });

    // Manejar errores del servidor
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logError(`Puerto ${PORT} ya está en uso`, error);
        process.exit(1);
      } else if (error.code === 'EACCES') {
        logError(`Permisos insuficientes para usar el puerto ${PORT}`, error);
        process.exit(1);
      } else {
        logError('Error del servidor', error);
        process.exit(1);
      }
    });

    // Timeout para requests
    server.setTimeout(30000, (socket) => {
      logInfo('Request timeout');
      socket.destroy();
    });

  } catch (error) {
    logError('Error al iniciar el servidor', error as Error);
    process.exit(1);
  }
}

// Función para cerrar el servidor gracefully
async function gracefulShutdown(signal: string) {
  logInfo(`👋 ${signal} recibido, cerrando servidor gracefully...`);
  
  if (server) {
    // Cerrar servidor HTTP
    server.close(() => {
      logInfo('✅ Servidor HTTP cerrado');
      
      // Cerrar conexiones de base de datos u otros recursos aquí
      // await database.close();
      
      process.exit(0);
    });

    // Forzar cierre después de 10 segundos
    setTimeout(() => {
      logWarning('⚠️ Forzando cierre del servidor');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logError('❌ Unhandled Rejection', undefined, {
    promise: promise.toString(),
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
  
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
  logError('❌ Uncaught Exception', error);
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Manejo de señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de advertencias
process.on('warning', (warning) => {
  logWarning(`Process warning: ${warning.name}`, {
    message: warning.message,
    stack: warning.stack
  });
});

// Iniciar servidor
startServer();
