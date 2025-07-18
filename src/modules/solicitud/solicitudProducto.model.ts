import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');

// Interfaces
export interface SolicitudProductoAttributes {
  solicitud_producto_id: number;
  solicitud_id: number;
  producto: 'CS' | 'CC' | 'FA' | 'AR';
  monto: number;
  plazo_meses: number;
  fecha_registro: Date;
}

export interface SolicitudProductoCreationAttributes extends Optional<SolicitudProductoAttributes, 'solicitud_producto_id' | 'fecha_registro'> {}

// Modelo
export class SolicitudProducto extends Model<SolicitudProductoAttributes, SolicitudProductoCreationAttributes> implements SolicitudProductoAttributes {
  public solicitud_producto_id!: number;
  public solicitud_id!: number;
  public producto!: 'CS' | 'CC' | 'FA' | 'AR';
  public monto!: number;
  public plazo_meses!: number;
  public fecha_registro!: Date;

  // Método para obtener el nombre del producto
  public getNombreProducto(): string {
    const productos = {
      CS: 'Crédito Simple',
      CC: 'Crédito Cuenta Corriente',
      FA: 'Factoraje',
      AR: 'Arrendamiento',
    };
    return productos[this.producto];
  }

  // Método para calcular pago mensual estimado
  public calcularPagoMensualEstimado(tasaAnual: number = 0.12): number {
    const tasaMensual = tasaAnual / 12;
    const factor = Math.pow(1 + tasaMensual, this.plazo_meses);
    return (this.monto * tasaMensual * factor) / (factor - 1);
  }
}

// Definición del modelo
SolicitudProducto.init(
  {
    solicitud_producto_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    solicitud_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    producto: {
      type: DataTypes.ENUM('CS', 'CC', 'FA', 'AR'),
      allowNull: false,
    },
    monto: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 1,
        max: 10000000,
      },
    },
    plazo_meses: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      validate: {
        min: 1,
        max: 60,
      },
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'solicitud_producto',
    timestamps: false,
    indexes: [
      {
        name: 'idx_solicitud_prod',
        fields: ['solicitud_id', 'producto'],
      },
    ],
  }
);

// Importar modelos relacionados para asociaciones
import { Solicitud } from './solicitud.model';

// Establecer asociaciones
SolicitudProducto.belongsTo(Solicitud, { foreignKey: 'solicitud_id', as: 'solicitud' });

export default SolicitudProducto;
