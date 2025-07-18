import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Middleware para validar el cuerpo de la petición
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Middleware para validar parámetros de la URL
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Middleware para validar query parameters
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de consulta inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Middleware para manejo de errores de multer
export const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction): void => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      message: 'El archivo es demasiado grande',
    });
    return;
  }
  
  if (error.message === 'Tipo de archivo no permitido') {
    res.status(400).json({
      success: false,
      message: 'Tipo de archivo no permitido',
    });
    return;
  }
  
  next(error);
};
