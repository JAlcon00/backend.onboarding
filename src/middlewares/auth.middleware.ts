import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Usuario } from '../modules/usuario/usuario.model';
import { env } from '../config/env';

interface AuthenticatedRequest extends Request {
  usuario?: Usuario;
}

// Middleware de autenticación
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
      });
      return;
    }
    
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    
    // Verificar que el usuario sigue existiendo y activo
    const usuario = await Usuario.findByPk(decoded.usuario_id);
    
    if (!usuario || !usuario.estaActivo()) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o usuario inactivo',
      });
      return;
    }
    
    req.usuario = usuario;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
      return;
    }
    
    res.status(401).json({
      success: false,
      message: 'Token inválido',
    });
  }
};

// Middleware de autorización por roles
export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const usuario = req.usuario;
    
    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }
    
    if (!roles.includes(usuario.rol)) {
      res.status(403).json({
        success: false,
        message: 'No tienes permisos para acceder a este recurso',
      });
      return;
    }
    
    next();
  };
};

// Middleware para verificar permisos específicos
export const checkPermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const usuario = req.usuario;
    
    if (!usuario) {
      res.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }
    
    if (!usuario.tienePermiso(permission)) {
      res.status(403).json({
        success: false,
        message: `No tienes permisos para: ${permission}`,
      });
      return;
    }
    
    next();
  };
};

// Middleware para verificar si es el mismo usuario o admin
export const checkOwnershipOrAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const usuario = req.usuario;
  const targetUserId = parseInt(req.params.id);
  
  if (!usuario) {
    res.status(401).json({
      success: false,
      message: 'Usuario no autenticado',
    });
    return;
  }
  
  // Permitir si es el mismo usuario o es admin/super
  if (usuario.usuario_id === targetUserId || ['ADMIN', 'SUPER'].includes(usuario.rol)) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'No tienes permisos para acceder a este recurso',
    });
  }
};
