import { Router } from 'express';
import { ClienteController } from './cliente.controller';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas especiales (deben ir antes de las rutas con parámetros)
router.get('/buscar/rfc/:rfc', ClienteController.buscarPorRFC);
router.get('/evaluar/rfc/:rfc', ClienteController.evaluarClienteRecurrente);
router.get('/estadisticas', authorizeRoles('ADMIN', 'SUPER'), ClienteController.getEstadisticas);

// Rutas para clientes
router.post('/', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), ClienteController.createCliente);
router.get('/', ClienteController.getClientes);
router.get('/:id', ClienteController.getClienteById);
router.put('/:id', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), ClienteController.updateCliente);
router.delete('/:id', authorizeRoles('ADMIN', 'SUPER'), ClienteController.deleteCliente);

// Rutas para validación y completitud
router.get('/:id/completitud', ClienteController.validarCompletitud);
router.get('/:id/onboarding', ClienteController.getEstadoOnboarding);
router.get('/:id/onboarding/verificar', ClienteController.verificarProcesoOnboarding);

// Rutas para ingresos de cliente
router.post('/:id/ingresos', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), ClienteController.createIngresoCliente);
router.get('/:id/ingresos', ClienteController.getIngresosCliente);
router.get('/:id/ingresos/estadisticas', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), ClienteController.getEstadisticasIngresos);

export default router;
