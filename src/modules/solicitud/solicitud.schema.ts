import { z } from 'zod';

// Schema para crear solicitud
export const createSolicitudSchema = z.object({
  cliente_id: z.number().int().positive(),
  productos: z.array(z.object({
    producto: z.enum(['CS', 'CC', 'FA', 'AR']),
    monto: z.number().positive().max(10000000),
    plazo_meses: z.number().int().positive().max(60),
  })).min(1),
});

// Schema para actualizar solicitud
export const updateSolicitudSchema = z.object({
  estatus: z.enum(['iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada']).optional(),
});

// Schema para actualizar producto de solicitud
export const updateProductoSolicitudSchema = z.object({
  monto: z.number().positive().max(10000000).optional(),
  plazo_meses: z.number().int().positive().max(60).optional(),
});

// Schema para crear producto en solicitud existente
export const createProductoSolicitudSchema = z.object({
  producto: z.enum(['CS', 'CC', 'FA', 'AR']),
  monto: z.number().positive().max(10000000),
  plazo_meses: z.number().int().positive().max(60),
});

// Schema para filtros de solicitud
export const solicitudFilterSchema = z.object({
  cliente_id: z.coerce.number().int().positive().optional(),
  estatus: z.enum(['iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada']).optional(),
  fecha_desde: z.string().date().optional(),
  fecha_hasta: z.string().date().optional(),
  producto: z.enum(['CS', 'CC', 'FA', 'AR']).optional(),
  monto_min: z.coerce.number().positive().optional(),
  monto_max: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Schema para parámetros de ID
export const solicitudIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const productoIdSchema = z.object({
  solicitudId: z.coerce.number().int().positive(),
  productoId: z.coerce.number().int().positive(),
});

// Tipos TypeScript derivados
export type CreateSolicitudInput = z.infer<typeof createSolicitudSchema>;
export type UpdateSolicitudInput = z.infer<typeof updateSolicitudSchema>;
export type UpdateProductoSolicitudInput = z.infer<typeof updateProductoSolicitudSchema>;
export type CreateProductoSolicitudInput = z.infer<typeof createProductoSolicitudSchema>;
export type SolicitudFilterInput = z.infer<typeof solicitudFilterSchema>;
export type SolicitudIdInput = z.infer<typeof solicitudIdSchema>;
export type ProductoIdInput = z.infer<typeof productoIdSchema>;
