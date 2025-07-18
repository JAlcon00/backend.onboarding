import { z } from 'zod';

// Schema para crear usuario
export const createUsuarioSchema = z.object({
  nombre: z.string().min(1).max(255),
  apellido: z.string().min(1).max(255),
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  correo: z.string().email().max(255),
  password: z.string().min(8).max(128),
  rol: z.enum(['SUPER', 'ADMIN', 'AUDITOR', 'OPERADOR']).default('OPERADOR'),
  estatus: z.enum(['activo', 'suspendido']).default('activo'),
});

// Schema para actualizar usuario
export const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).max(255).optional(),
  apellido: z.string().min(1).max(255).optional(),
  username: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  correo: z.string().email().max(255).optional(),
  password: z.string().min(8).max(128).optional(),
  rol: z.enum(['SUPER', 'ADMIN', 'AUDITOR', 'OPERADOR']).optional(),
  estatus: z.enum(['activo', 'suspendido']).optional(),
});

// Schema para login
export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// Schema para cambiar contraseña
export const changePasswordSchema = z.object({
  password_actual: z.string().min(1),
  password_nuevo: z.string().min(8).max(128),
  confirmar_password: z.string().min(8).max(128),
}).refine((data) => data.password_nuevo === data.confirmar_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar_password'],
});

// Schema para filtros de usuario
export const usuarioFilterSchema = z.object({
  rol: z.enum(['SUPER', 'ADMIN', 'AUDITOR', 'OPERADOR']).optional(),
  estatus: z.enum(['activo', 'suspendido']).optional(),
  search: z.string().optional(), // Para buscar por nombre, apellido o username
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Schema para parámetros de ID
export const usuarioIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Schema para verificar token
export const verifyTokenSchema = z.object({
  token: z.string().min(1),
});

// Tipos TypeScript derivados
export type CreateUsuarioInput = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.infer<typeof updateUsuarioSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UsuarioFilterInput = z.infer<typeof usuarioFilterSchema>;
export type UsuarioIdInput = z.infer<typeof usuarioIdSchema>;
export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;
