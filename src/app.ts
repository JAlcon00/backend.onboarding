import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { CacheService } from './config/cache';
import { logInfo, logError } from './config/logger';
import { swaggerSpec, swaggerUiOptions } from './config/swagger';
import routes from './routes';
import { errorHandler, notFoundHandler, asyncHandler } from './middlewares/error.middleware';
import { handleMulterError } from './middlewares/validation.middleware';
import { metricsMiddleware, errorTrackingMiddleware } from './middlewares/metrics.middleware';
import { responseSizeMiddleware, memoryCleanupMiddleware, autoPaginationMiddleware } from './middlewares/performance.middleware';
import { readOperationLimiter, writeOperationLimiter } from './middlewares/rateLimiter.middleware';

// Importar modelos para establecer relaciones
import './modules/cliente/cliente.model';
import './modules/cliente/ingresoCliente.model';
import './modules/documento/documento.model';
import './modules/documento/documentoTipo.model';
import './modules/solicitud/solicitud.model';
import './modules/solicitud/solicitudProducto.model';
import './modules/usuario/usuario.model';

// Establecer asociaciones entre modelos (comentado por conflictos)
// import { setupAssociations } from './models/associations';
// setupAssociations();

// Las asociaciones se definen ahora en cada modelo individual


const app = express();

// Configuración de CORS (debe ir antes de cualquier otro middleware)
app.use(cors());

// Inicializar caché
CacheService.init().catch((error) => {
  logError('Error al inicializar caché', error);
});

// Configuración de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compresión gzip
app.use(compression());

// Middlewares de rendimiento
app.use(responseSizeMiddleware(10 * 1024 * 1024)); // 10MB max response size
app.use(memoryCleanupMiddleware);
app.use(autoPaginationMiddleware(50, 200)); // default 50, max 200

// Rate limiting específico por tipo de operación
app.use((req, res, next) => {
  if (req.method === 'GET') {
    return readOperationLimiter(req, res, next);
  } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return writeOperationLimiter(req, res, next);
  }
  next();
});

// Middlewares básicos
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('JSON malformado');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000,
}));

// Middleware para establecer headers de seguridad adicionales
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Middleware para logging de requests y métricas
app.use(metricsMiddleware);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Endpoint para JSON de Swagger
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Endpoint de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Rutas principales
app.use(routes);

// Middleware para errores de multer
app.use(handleMulterError);

// Middleware para rastreo de errores
app.use(errorTrackingMiddleware);

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

export default app;
