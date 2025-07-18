import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');
import { Cliente } from './cliente.model';

// Interfaces
export interface IngresoClienteAttributes {
  ingreso_id: number;
  cliente_id: number;
  tipo_persona: 'PF' | 'PF_AE' | 'PM';
  sector: string;
  giro?: string;
  ingreso_anual: number;
  moneda: string;
  fecha_registro: Date;
}

export interface IngresoClienteCreationAttributes extends Optional<IngresoClienteAttributes, 'ingreso_id' | 'fecha_registro'> {}

// Modelo
export class IngresoCliente extends Model<IngresoClienteAttributes, IngresoClienteCreationAttributes> implements IngresoClienteAttributes {
  public ingreso_id!: number;
  public cliente_id!: number;
  public tipo_persona!: 'PF' | 'PF_AE' | 'PM';
  public sector!: string;
  public giro?: string;
  public ingreso_anual!: number;
  public moneda!: string;
  public fecha_registro!: Date;
}

// Definición del modelo
IngresoCliente.init(
  {
    ingreso_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    cliente_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: {
        model: Cliente,
        key: 'cliente_id',
      },
    },
    tipo_persona: {
      type: DataTypes.ENUM('PF', 'PF_AE', 'PM'),
      allowNull: false,
    },
    sector: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    giro: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ingreso_anual: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    moneda: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: 'MXN',
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'ingreso_cliente',
    timestamps: false,
    indexes: [
      {
        name: 'idx_cliente',
        fields: ['cliente_id'],
      },
      {
        name: 'idx_sector',
        fields: ['sector'],
      },
      {
        name: 'idx_cli_fecha',
        fields: ['cliente_id', 'fecha_registro'],
      },
    ],
  }
);

// Establecer asociaciones (Cliente ya está importado arriba)
IngresoCliente.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteIngreso' });
Cliente.hasMany(IngresoCliente, { foreignKey: 'cliente_id', as: 'ingresos' });

export default IngresoCliente;
