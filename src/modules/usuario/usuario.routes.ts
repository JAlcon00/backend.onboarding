import { Router } from 'express';
import { UsuarioController } from './usuario.controller';
import { authenticateToken, authorizeRoles, checkOwnershipOrAdmin } from '../../middlewares/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/login', UsuarioController.login);

// Rutas protegidas - requieren autenticación
router.use(authenticateToken);

// Perfil del usuario actual
router.get('/profile', UsuarioController.getProfile);

// Cambiar contraseña (propio usuario o admin)
router.patch('/:id/change-password', checkOwnershipOrAdmin, UsuarioController.changePassword);

// Rutas que requieren permisos de admin
router.post('/', authorizeRoles('ADMIN', 'SUPER'), UsuarioController.createUsuario);
router.get('/', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), UsuarioController.getUsuarios);
router.get('/:id', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), UsuarioController.getUsuarioById);
router.put('/:id', authorizeRoles('ADMIN', 'SUPER'), UsuarioController.updateUsuario);
router.delete('/:id', authorizeRoles('SUPER'), UsuarioController.deleteUsuario);

export default router;
