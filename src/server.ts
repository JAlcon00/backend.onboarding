import app from './app';
import { env } from './config/env';
import { Server } from 'http';
const { testDbConnection } = require('./config/database');

const PORT = env.PORT || 3000;
let server: Server;

// Función para iniciar el servidor
async function startServer() {
  try {
    // Probar conexión a la base de datos
    await testDbConnection();
    console.log('✅ Conexión a la base de datos establecida');

    // Iniciar servidor
    server = app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`💊 Health check: http://localhost:${PORT}/health`);
    });

    // Manejar errores del servidor
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Puerto ${PORT} ya está en uso`);
        process.exit(1);
      } else if (error.code === 'EACCES') {
        console.error(`❌ Permisos insuficientes para usar el puerto ${PORT}`);
        process.exit(1);
      } else {
        console.error('❌ Error del servidor:', error);
        process.exit(1);
      }
    });

    // Timeout para requests
    server.setTimeout(30000, (socket) => {
      console.log('⏱️ Request timeout');
      socket.destroy();
    });

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Función para cerrar el servidor gracefully
async function gracefulShutdown(signal: string) {
  console.log(`👋 ${signal} recibido, cerrando servidor gracefully...`);
  
  if (server) {
    // Cerrar servidor HTTP
    server.close(() => {
      console.log('✅ Servidor HTTP cerrado');
      
      // Cerrar conexiones de base de datos u otros recursos aquí
      // await database.close();
      
      process.exit(0);
    });

    // Forzar cierre después de 10 segundos
    setTimeout(() => {
      console.log('⚠️ Forzando cierre del servidor');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  
  // Log adicional para debugging
  if (reason instanceof Error) {
    console.error('❌ Error stack:', reason.stack);
  }
  
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('❌ Stack:', error.stack);
  
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Manejo de señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de advertencias
process.on('warning', (warning) => {
  console.warn('⚠️ Warning:', warning.name);
  console.warn('⚠️ Message:', warning.message);
  console.warn('⚠️ Stack:', warning.stack);
});

// Iniciar servidor
startServer();
