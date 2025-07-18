import { z } from 'zod';

// Schema base para cliente
const baseClienteSchema = z.object({
  tipo_persona: z.enum(['PF', 'PF_AE', 'PM']),
  nombre: z.string().min(1).max(255).optional(),
  apellido_paterno: z.string().min(1).max(255).optional(),
  apellido_materno: z.string().min(1).max(255).optional(),
  razon_social: z.string().min(1).max(255).optional(),
  representante_legal: z.string().min(1).max(255).optional(),
  rfc: z.string().min(12).max(13).regex(/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/),
  curp: z.string().length(18).regex(/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/).optional(),
  fecha_nacimiento: z.string().date().optional(),
  fecha_constitucion: z.string().date().optional(),
  correo: z.string().email().max(255),
  telefono: z.string().max(15).optional(),
  calle: z.string().max(255).optional(),
  numero_exterior: z.string().max(10).optional(),
  numero_interior: z.string().max(10).optional(),
  colonia: z.string().max(255).optional(),
  codigo_postal: z.string().length(5).regex(/^[0-9]{5}$/).optional(),
  ciudad: z.string().max(100).optional(),
  estado: z.string().max(100).optional(),
  pais: z.string().max(100).default('México'),
});

// Schema para crear cliente con validaciones adicionales
export const createClienteSchema = baseClienteSchema
  .refine((data) => {
    // Validar que para PF y PF_AE, nombre y apellido_paterno son obligatorios
    if ((data.tipo_persona === 'PF' || data.tipo_persona === 'PF_AE') && (!data.nombre || !data.apellido_paterno)) {
      return false;
    }
    // Validar que para PM, razon_social es obligatoria
    if (data.tipo_persona === 'PM' && !data.razon_social) {
      return false;
    }
    return true;
  }, {
    message: 'Datos obligatorios faltantes según el tipo de persona',
  })
  .refine((data) => {
    // Validar RFC según tipo de persona
    if (data.tipo_persona === 'PM') {
      return /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/.test(data.rfc);
    } else {
      return /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/.test(data.rfc);
    }
  }, {
    message: 'El formato del RFC no corresponde al tipo de persona',
  })
  .refine((data) => {
    // Validar edad para personas físicas
    if ((data.tipo_persona === 'PF' || data.tipo_persona === 'PF_AE') && data.fecha_nacimiento) {
      const fechaNacimiento = new Date(data.fecha_nacimiento);
      const today = new Date();
      const edad = today.getFullYear() - fechaNacimiento.getFullYear();
      const monthDiff = today.getMonth() - fechaNacimiento.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < fechaNacimiento.getDate())) {
        return edad - 1 >= 18;
      }
      return edad >= 18;
    }
    return true;
  }, {
    message: 'El cliente debe ser mayor de edad (18 años)',
  });

// Schema para actualizar cliente
export const updateClienteSchema = baseClienteSchema.partial().omit({ tipo_persona: true });

// Schema para parámetros de ID
export const clienteIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Schema para filtros de búsqueda
export const clienteFilterSchema = z.object({
  tipo_persona: z.enum(['PF', 'PF_AE', 'PM']).optional(),
  estado: z.string().optional(),
  ciudad: z.string().optional(),
  codigo_postal: z.string().optional(),
  search: z.string().optional(), // Para búsqueda general
  completed: z.boolean().optional(), // Para filtrar por expediente completo
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Schema para validación de edad (personas físicas)
export const validarEdadSchema = z.object({
  fecha_nacimiento: z.string().date(),
}).refine((data) => {
  const fechaNacimiento = new Date(data.fecha_nacimiento);
  const today = new Date();
  const edad = today.getFullYear() - fechaNacimiento.getFullYear();
  const monthDiff = today.getMonth() - fechaNacimiento.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < fechaNacimiento.getDate())) {
    return edad - 1 >= 18;
  }
  return edad >= 18;
}, {
  message: 'El cliente debe ser mayor de edad (18 años)',
});

// Schema para validación específica de RFC por tipo de persona
export const validarRfcTipoPersona = z.object({
  rfc: z.string().min(12).max(13),
  tipo_persona: z.enum(['PF', 'PF_AE', 'PM']),
}).refine((data) => {
  if (data.tipo_persona === 'PM') {
    // RFC de persona moral: 3 caracteres + 6 dígitos + 3 caracteres
    return /^[A-Z&Ñ]{3}[0-9]{6}[A-Z0-9]{3}$/.test(data.rfc);
  } else {
    // RFC de persona física: 4 caracteres + 6 dígitos + 3 caracteres
    return /^[A-Z&Ñ]{4}[0-9]{6}[A-Z0-9]{3}$/.test(data.rfc);
  }
}, {
  message: 'El formato del RFC no corresponde al tipo de persona',
});

// Schema para ingreso de cliente
export const createIngresoClienteSchema = z.object({
  cliente_id: z.number().int().positive(),
  tipo_persona: z.enum(['PF', 'PF_AE', 'PM']),
  sector: z.string().min(1).max(100),
  giro: z.string().max(255).optional(),
  ingreso_anual: z.number().positive(),
  moneda: z.string().length(3).default('MXN'),
});

export const updateIngresoClienteSchema = createIngresoClienteSchema.partial().omit({ cliente_id: true });

// Tipos TypeScript derivados
export type CreateClienteInput = z.infer<typeof createClienteSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
export type ClienteIdInput = z.infer<typeof clienteIdSchema>;
export type ClienteFilterInput = z.infer<typeof clienteFilterSchema>;
export type CreateIngresoClienteInput = z.infer<typeof createIngresoClienteSchema>;
export type UpdateIngresoClienteInput = z.infer<typeof updateIngresoClienteSchema>;
