import { Router, Request, Response } from 'express';
import { requestIdMiddleware, timeoutMiddleware } from '../middlewares/error.middleware';
import { CacheService } from '../config/cache';
import { HealthController } from '../controllers/health.controller';
import { healthCheckLimiter } from '../middlewares/rateLimiter.middleware';
import { logHttp } from '../config/logger';
import clienteRoutes from '../modules/cliente/cliente.routes';
import documentoRoutes from '../modules/documento/documento.routes';
import solicitudRoutes from '../modules/solicitud/solicitud.routes';
import usuarioRoutes from '../modules/usuario/usuario.routes';

const router = Router();

// Middlewares globales para todas las rutas
router.use(requestIdMiddleware);
router.use(timeoutMiddleware(30000)); // 30 segundos timeout

// Middleware para logging de rutas API
router.use('/api', (req: Request, res: Response, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const requestId = req.get('X-Request-ID');
    
    logHttp(`${req.method} ${req.path}`, {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Rutas de health check con rate limiting específico
router.get('/health', healthCheckLimiter, HealthController.healthCheck);
router.get('/health/simple', healthCheckLimiter, HealthController.simpleHealthCheck);
router.post('/health/gc', healthCheckLimiter, HealthController.forceGarbageCollection);

// Rutas principales
router.use('/api/clientes', clienteRoutes);
router.use('/api/documentos', documentoRoutes);
router.use('/api/solicitudes', solicitudRoutes);
router.use('/api/usuarios', usuarioRoutes);

// Ruta para limpiar caché (solo para desarrollo)
router.post('/cache/clear', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403).json({
      success: false,
      message: 'No disponible en producción'
    });
    return;
  }

  const pattern = req.body.pattern || '*';
  CacheService.delPattern(pattern);
  
  res.json({
    success: true,
    message: `Caché limpiado para patrón: ${pattern}`
  });
});

// Ruta para información de la API
router.get('/api/info', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Onboarding Digital API',
    version: '1.0.0',
    endpoints: {
      clientes: '/api/clientes',
      documentos: '/api/documentos',
      solicitudes: '/api/solicitudes',
      usuarios: '/api/usuarios',
    },
    documentation: '/api/docs', // Para futuro swagger
  });
});

export default router;
