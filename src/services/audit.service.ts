import { Request, Response, NextFunction } from 'express';
import Audit, { AuditCreationAttributes } from '../models/audit.model';
import { logInfo, logError } from '../config/logger';
import { getCurrentRequestId } from '../middlewares/request-id.middleware';

// Tipos de acciones para auditoría
export enum AuditAction {
  // Autenticación
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // CRUD Operations
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // Documentos
  DOCUMENT_UPLOAD = 'DOCUMENT_UPLOAD',
  DOCUMENT_DOWNLOAD = 'DOCUMENT_DOWNLOAD',
  DOCUMENT_DELETE = 'DOCUMENT_DELETE',
  DOCUMENT_VALIDATE = 'DOCUMENT_VALIDATE',
  
  // Cliente
  CLIENT_CREATE = 'CLIENT_CREATE',
  CLIENT_UPDATE = 'CLIENT_UPDATE',
  CLIENT_DELETE = 'CLIENT_DELETE',
  CLIENT_STATUS_CHANGE = 'CLIENT_STATUS_CHANGE',
  
  // Solicitudes
  SOLICITUD_CREATE = 'SOLICITUD_CREATE',
  SOLICITUD_UPDATE = 'SOLICITUD_UPDATE',
  SOLICITUD_APPROVE = 'SOLICITUD_APPROVE',
  SOLICITUD_REJECT = 'SOLICITUD_REJECT',
  
  // Sistema
  EXPORT_DATA = 'EXPORT_DATA',
  IMPORT_DATA = 'IMPORT_DATA',
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  
  // Compliance
  KYC_CHECK = 'KYC_CHECK',
  COMPLIANCE_REVIEW = 'COMPLIANCE_REVIEW',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT'
}

// Entidades auditables
export enum AuditEntity {
  USER = 'User',
  CLIENT = 'Client',
  DOCUMENT = 'Document',
  SOLICITUD = 'Solicitud',
  AUTHENTICATION = 'Authentication',
  SYSTEM = 'System',
  COMPLIANCE = 'Compliance'
}

// Interfaz para datos de auditoría
export interface AuditData {
  userId?: number;
  userEmail?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number;
  beforeData?: any;
  afterData?: any;
  success?: boolean;
  errorMessage?: string;
  additionalMetadata?: any;
}

// Clase del servicio de auditoría
export class AuditService {
  
  /**
   * Registra una acción de auditoría
   */
  static async logAction(
    auditData: AuditData,
    req?: Request
  ): Promise<Audit | null> {
    try {
      // Scrub de datos sensibles antes de almacenar
      const scrubbedBefore = this.scrubSensitiveData(auditData.beforeData);
      const scrubbedAfter = this.scrubSensitiveData(auditData.afterData);
      
      const auditRecord: AuditCreationAttributes = {
        userId: auditData.userId,
        userEmail: auditData.userEmail,
        action: auditData.action,
        entity: auditData.entity,
        entityId: auditData.entityId?.toString(),
        beforeData: scrubbedBefore,
        afterData: scrubbedAfter,
        success: auditData.success ?? true,
        errorMessage: auditData.errorMessage,
        additionalMetadata: auditData.additionalMetadata,
        
        // Datos del request si están disponibles
        ipAddress: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.headers['user-agent'],
        requestId: getCurrentRequestId(req),
        sessionId: this.extractSessionId(req),
        timestamp: new Date()
      };
      
      const audit = await Audit.create(auditRecord);
      
      logInfo('Acción auditada registrada', {
        auditId: audit.id,
        action: auditData.action,
        entity: auditData.entity,
        entityId: auditData.entityId,
        userId: auditData.userId,
        requestId: getCurrentRequestId(req)
      });
      
      return audit;
    } catch (error) {
      logError('Error registrando auditoría', error as Error, {
        action: auditData.action,
        entity: auditData.entity,
        entityId: auditData.entityId
      });
      return null;
    }
  }
  
  /**
   * Registra login exitoso
   */
  static async logSuccessfulLogin(
    userId: number,
    userEmail: string,
    req?: Request
  ): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      action: AuditAction.LOGIN,
      entity: AuditEntity.AUTHENTICATION,
      entityId: userId,
      success: true,
      additionalMetadata: {
        loginTime: new Date().toISOString()
      }
    }, req);
  }
  
  /**
   * Registra intento de login fallido
   */
  static async logFailedLogin(
    email: string,
    reason: string,
    req?: Request
  ): Promise<void> {
    await this.logAction({
      userEmail: email,
      action: AuditAction.LOGIN_FAILED,
      entity: AuditEntity.AUTHENTICATION,
      success: false,
      errorMessage: reason,
      additionalMetadata: {
        failureReason: reason,
        attemptTime: new Date().toISOString()
      }
    }, req);
  }
  
  /**
   * Registra cambios en entidades
   */
  static async logEntityChange(
    action: AuditAction,
    entity: AuditEntity,
    entityId: string | number,
    beforeData: any,
    afterData: any,
    req?: Request,
    userId?: number,
    userEmail?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      action,
      entity,
      entityId,
      beforeData,
      afterData,
      success: true
    }, req);
  }
  
  /**
   * Registra acciones de compliance
   */
  static async logComplianceAction(
    action: AuditAction,
    entityId: string | number,
    result: any,
    req?: Request,
    userId?: number,
    userEmail?: string
  ): Promise<void> {
    await this.logAction({
      userId,
      userEmail,
      action,
      entity: AuditEntity.COMPLIANCE,
      entityId,
      afterData: result,
      success: true,
      additionalMetadata: {
        complianceCheck: true,
        timestamp: new Date().toISOString()
      }
    }, req);
  }
  
  /**
   * Obtiene el historial de auditoría de una entidad
   */
  static async getEntityAuditHistory(
    entity: AuditEntity,
    entityId: string | number,
    limit: number = 50
  ): Promise<Audit[]> {
    try {
      return await Audit.findAll({
        where: {
          entity,
          entityId: entityId.toString()
        },
        order: [['timestamp', 'DESC']],
        limit
      });
    } catch (error) {
      logError('Error obteniendo historial de auditoría', error as Error);
      return [];
    }
  }
  
  /**
   * Obtiene el historial de un usuario
   */
  static async getUserAuditHistory(
    userId: number,
    limit: number = 100
  ): Promise<Audit[]> {
    try {
      return await Audit.findAll({
        where: { userId },
        order: [['timestamp', 'DESC']],
        limit
      });
    } catch (error) {
      logError('Error obteniendo historial de usuario', error as Error);
      return [];
    }
  }
  
  /**
   * Limpia datos sensibles antes de almacenar
   */
  private static scrubSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    const sensitiveFields = [
      'password', 'pwd', 'pass', 'secret', 'token', 'jwt',
      'creditCard', 'credit_card', 'ssn', 'social_security'
    ];
    
    const scrubbed = { ...data };
    
    for (const field of sensitiveFields) {
      if (scrubbed[field]) {
        scrubbed[field] = '[REDACTED]';
      }
    }
    
    return scrubbed;
  }
  
  /**
   * Extrae el session ID del request
   */
  private static extractSessionId(req?: Request): string | undefined {
    if (!req) return undefined;
    
    // Intentar obtener de diferentes fuentes
    return (req as any).sessionID || 
           req.headers['x-session-id'] as string ||
           (req as any).cookies?.sessionId;
  }
}

// Middleware para auditoría automática
export const auditMiddleware = (
  action: AuditAction,
  entity: AuditEntity,
  options: {
    extractEntityId?: (req: Request) => string | number;
    extractUserId?: (req: Request) => number;
    extractUserEmail?: (req: Request) => string;
    includeBody?: boolean;
  } = {}
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Registrar auditoría después de la respuesta
      setImmediate(async () => {
        try {
          const entityId = options.extractEntityId?.(req) || req.params.id;
          const userId = options.extractUserId?.(req);
          const userEmail = options.extractUserEmail?.(req);
          
          await AuditService.logAction({
            userId,
            userEmail,
            action,
            entity,
            entityId,
            beforeData: options.includeBody ? req.body : undefined,
            afterData: res.statusCode < 400 ? data : undefined,
            success: res.statusCode < 400,
            errorMessage: res.statusCode >= 400 ? data?.message : undefined
          }, req);
        } catch (error) {
          logError('Error en auditoría automática', error as Error);
        }
      });
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

export default AuditService;
