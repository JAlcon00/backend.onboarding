// Modelo de auditoría para compliance y KYC
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Atributos de la tabla de auditoría
interface AuditAttributes {
  id: number;
  userId?: number;
  userEmail?: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  additionalMetadata?: any;
}

// Atributos opcionales para creación
interface AuditCreationAttributes extends Optional<AuditAttributes, 'id' | 'timestamp'> {}

// Modelo de Auditoría
class Audit extends Model<AuditAttributes, AuditCreationAttributes> implements AuditAttributes {
  public id!: number;
  public userId?: number;
  public userEmail?: string;
  public action!: string;
  public entity!: string;
  public entityId?: string;
  public beforeData?: any;
  public afterData?: any;
  public ipAddress?: string;
  public userAgent?: string;
  public requestId?: string;
  public sessionId?: string;
  public success!: boolean;
  public errorMessage?: string;
  public timestamp!: Date;
  public additionalMetadata?: any;

  // Timestamps automáticos
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Definición del modelo
Audit.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID del usuario que realizó la acción'
  },
  userEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email del usuario para trazabilidad'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Acción realizada (CREATE, UPDATE, DELETE, LOGIN, etc.)'
  },
  entity: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Entidad afectada (Usuario, Documento, Cliente, etc.)'
  },
  entityId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID de la entidad afectada'
  },
  beforeData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Estado anterior de la entidad (para UPDATE/DELETE)'
  },
  afterData: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Estado posterior de la entidad (para CREATE/UPDATE)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'Dirección IP del cliente'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'User Agent del navegador/cliente'
  },
  requestId: {
    type: DataTypes.STRING(36),
    allowNull: true,
    comment: 'ID de correlación del request'
  },
  sessionId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'ID de sesión del usuario'
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Indica si la acción fue exitosa'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje de error en caso de fallo'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp de la acción'
  },
  additionalMetadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Metadatos adicionales específicos del contexto'
  }
}, {
  sequelize,
  tableName: 'audit_log',
  modelName: 'Audit',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entity']
    },
    {
      fields: ['entityId']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['requestId']
    },
    {
      fields: ['ipAddress']
    },
    {
      fields: ['success']
    },
    // Índice compuesto para búsquedas frecuentes
    {
      fields: ['entity', 'entityId', 'timestamp']
    },
    {
      fields: ['userId', 'action', 'timestamp']
    }
  ]
});

export default Audit;
export { AuditAttributes, AuditCreationAttributes };
