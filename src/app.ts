import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler, asyncHandler } from './middlewares/error.middleware';
import { handleMulterError } from './middlewares/validation.middleware';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limitar cada IP a 100 requests por windowMs
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP, intente de nuevo más tarde.'
  },
  standardHeaders: true, // Retornar rate limit info en los headers `RateLimit-*`
  legacyHeaders: false, // Desactivar headers `X-RateLimit-*`
});

app.use('/api/', limiter);

// Configuración de CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Cambiar por tu dominio en producción
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

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

// Middleware para logging de requests
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    
    // Interceptar el final de la respuesta
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
  });
}

// Rutas principales
app.use(routes);

// Middleware para errores de multer
app.use(handleMulterError);

// Middleware para rutas no encontradas
app.use(notFoundHandler);

// Middleware de manejo de errores (debe ir al final)
app.use(errorHandler);

export default app;
