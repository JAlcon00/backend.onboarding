import { Router, Request, Response } from 'express';
import { requestIdMiddleware, timeoutMiddleware } from '../middlewares/error.middleware';
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
    
    console.log(`[${requestId}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Rutas principales
router.use('/api/clientes', clienteRoutes);
router.use('/api/documentos', documentoRoutes);
router.use('/api/solicitudes', solicitudRoutes);
router.use('/api/usuarios', usuarioRoutes);

// Ruta de salud del sistema
router.get('/health', (req: Request, res: Response) => {
  const healthCheck = {
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    system: {
      platform: process.platform,
      arch: process.arch,
      node: process.version,
    },
  };

  res.json(healthCheck);
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
