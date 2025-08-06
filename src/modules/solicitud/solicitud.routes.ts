import { Router } from 'express';
import { SolicitudController } from './solicitud.controller';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para solicitudes
router.post('/', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), SolicitudController.createSolicitud);
router.get('/', SolicitudController.getSolicitudes);
router.get('/:id', SolicitudController.getSolicitudById);
router.put('/:id', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), SolicitudController.updateSolicitud);
router.delete('/:id', authorizeRoles('ADMIN', 'SUPER'), SolicitudController.deleteSolicitud);

// Rutas para productos de solicitudes
router.post('/:id/productos', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), SolicitudController.addProductoToSolicitud);
router.put('/:solicitudId/productos/:productoId', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), SolicitudController.updateProductoSolicitud);
router.delete('/:solicitudId/productos/:productoId', authorizeRoles('ADMIN', 'SUPER'), SolicitudController.deleteProductoSolicitud);

// ==================== RUTAS ADMINISTRATIVAS AVANZADAS ====================

// Dashboard y Analytics - Solo para ADMIN, SUPER y AUDITOR
router.get('/admin/dashboard-ejecutivo', 
  authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), 
  SolicitudController.getDashboardEjecutivo
);

router.get('/admin/analisis-rentabilidad', 
  authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), 
  SolicitudController.getAnalisisRentabilidad
);

router.get('/admin/reporte-performance-comparativo', 
  authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), 
  SolicitudController.getReportePerformanceComparativo
);

// Gestión de Equipo y Carga de Trabajo - Solo ADMIN y SUPER
router.get('/admin/gestion-carga-trabajo', 
  authorizeRoles('ADMIN', 'SUPER'), 
  SolicitudController.getGestionCargaTrabajo
);

router.get('/admin/alertas-inteligentes', 
  authorizeRoles('ADMIN', 'SUPER'), 
  SolicitudController.getAlertasInteligentes
);

// Operaciones Avanzadas - Solo ADMIN y SUPER
router.post('/:id/admin/asignar-inteligente', 
  authorizeRoles('ADMIN', 'SUPER'), 
  SolicitudController.asignarSolicitudInteligente
);

// Exportación de Datos - ADMIN, SUPER y AUDITOR
router.get('/admin/exportar-datos', 
  authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), 
  SolicitudController.exportarDatosSolicitudes
);

export default router;
