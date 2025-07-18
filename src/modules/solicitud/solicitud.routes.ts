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

export default router;
