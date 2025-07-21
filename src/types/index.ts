// =================================
// TIPOS GLOBALES - BACKEND
// =================================

import { Request } from 'express';

// Extensión de Request para tipos personalizados
export interface AuthenticatedRequest extends Request {
  usuario?: {
    usuario_id: number;
    email: string;
    rol: string;
    nombre: string;
  };
  requestId?: string;
  startTime?: number;
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
  };
}

// Tipos para filtros de búsqueda
export interface SearchFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  [key: string]: any;
}

// Tipos para cache
export interface CacheData<T = any> {
  data: T;
  expiration: number;
  key: string;
}

// Tipos para logging
export interface LogContext {
  userId?: number;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  [key: string]: any;
}

// Tipos para métricas
export interface MetricData {
  name: string;
  value: number | string;
  timestamp: Date;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

// Tipos para transacciones
export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  rollback?: boolean;
}

// Enums para estatus
export enum SolicitudEstatus {
  INICIADA = 'iniciada',
  EN_REVISION = 'en_revision',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
  CANCELADA = 'cancelada'
}

export enum TipoProducto {
  CS = 'CS', // Cuenta de ahorro
  CC = 'CC', // Cuenta corriente
  FA = 'FA', // Financiamiento automotriz
  AR = 'AR'  // Arrendamiento
}

export enum TipoPersona {
  FISICA = 'fisica',
  MORAL = 'moral'
}

export enum DocumentoEstatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  EN_REVISION = 'en_revision'
}

// Tipos para validaciones
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Tipos para archivos
export interface FileUploadResult {
  url: string;
  rutaCompleta: string;
  metadata: {
    size: number;
    mimeType: string;
    originalName: string;
    fileName: string;
  };
}

// Tipos para health check
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version?: string;
  uptime: number;
  checks: {
    database: HealthCheckResult;
    cache: HealthCheckResult;
    memory: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  details?: any;
}
