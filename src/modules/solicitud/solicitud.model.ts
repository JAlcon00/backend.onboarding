import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');

// Interfaces
export interface SolicitudAttributes {
  solicitud_id: number;
  cliente_id: number;
  estatus: 'iniciada' | 'en_revision' | 'aprobada' | 'rechazada' | 'cancelada';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface SolicitudCreationAttributes extends Optional<SolicitudAttributes, 'solicitud_id' | 'fecha_creacion' | 'fecha_actualizacion'> {}

// Modelo
export class Solicitud extends Model<SolicitudAttributes, SolicitudCreationAttributes> implements SolicitudAttributes {
  public solicitud_id!: number;
  public cliente_id!: number;
  public estatus!: 'iniciada' | 'en_revision' | 'aprobada' | 'rechazada' | 'cancelada';
  public fecha_creacion!: Date;
  public fecha_actualizacion!: Date;

  // Método para verificar si puede ser modificada
  public puedeSerModificada(): boolean {
    return this.estatus === 'iniciada';
  }

  // Método para verificar si está finalizada
  public estaFinalizada(): boolean {
    return ['aprobada', 'rechazada', 'cancelada'].includes(this.estatus);
  }
}

// Definición del modelo
Solicitud.init(
  {
    solicitud_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    cliente_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    estatus: {
      type: DataTypes.ENUM('iniciada', 'en_revision', 'aprobada', 'rechazada', 'cancelada'),
      allowNull: false,
      defaultValue: 'iniciada',
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'solicitud',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    indexes: [
      {
        name: 'idx_cliente_fecha',
        fields: ['cliente_id', 'fecha_creacion'],
      },
    ],
  }
);

// Importar modelos relacionados para asociaciones
import { Cliente } from '../cliente/cliente.model';
import { SolicitudProducto } from './solicitudProducto.model';

// Establecer asociaciones
Solicitud.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteSolicitud' });
Solicitud.hasMany(SolicitudProducto, { foreignKey: 'solicitud_id', as: 'productos' });

export default Solicitud;
