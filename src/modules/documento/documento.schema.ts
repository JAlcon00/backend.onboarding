import { z } from 'zod';

// Schema para crear documento
export const createDocumentoSchema = z.object({
  cliente_id: z.number().int().positive(),
  documento_tipo_id: z.number().int().positive(),
  archivo_url: z.string().url().max(1000),
  fecha_documento: z.string().date(),
  fecha_expiracion: z.string().date().optional(),
  comentario_revisor: z.string().max(500).optional(),
});

// Schema para actualizar documento
export const updateDocumentoSchema = z.object({
  archivo_url: z.string().url().max(1000).optional(),
  fecha_documento: z.string().date().optional(),
  fecha_expiracion: z.string().date().optional(),
  estatus: z.enum(['pendiente', 'aceptado', 'rechazado', 'vencido']).optional(),
  comentario_revisor: z.string().max(500).optional(),
});

// Schema para revisar documento
export const reviewDocumentoSchema = z.object({
  estatus: z.enum(['aceptado', 'rechazado']),
  comentario_revisor: z.string().max(500).optional(),
});

// Schema para filtros de documento
export const documentoFilterSchema = z.object({
  cliente_id: z.coerce.number().int().positive().optional(),
  documento_tipo_id: z.coerce.number().int().positive().optional(),
  estatus: z.enum(['pendiente', 'aceptado', 'rechazado', 'vencido']).optional(),
  fecha_desde: z.string().date().optional(),
  fecha_hasta: z.string().date().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Schema para parámetros de ID
export const documentoIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Schema para tipo de documento
export const documentoTipoFilterSchema = z.object({
  tipo_persona: z.enum(['PF', 'PF_AE', 'PM']).optional(),
  opcional: z.coerce.boolean().optional(),
});

// Tipos TypeScript derivados
export type CreateDocumentoInput = z.infer<typeof createDocumentoSchema>;
export type UpdateDocumentoInput = z.infer<typeof updateDocumentoSchema>;
export type ReviewDocumentoInput = z.infer<typeof reviewDocumentoSchema>;
export type DocumentoFilterInput = z.infer<typeof documentoFilterSchema>;
export type DocumentoIdInput = z.infer<typeof documentoIdSchema>;
export type DocumentoTipoFilterInput = z.infer<typeof documentoTipoFilterSchema>;
