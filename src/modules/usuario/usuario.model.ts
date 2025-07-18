import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');
import bcrypt from 'bcrypt';

// Interfaces
export interface UsuarioAttributes {
  usuario_id: number;
  nombre: string;
  apellido: string;
  username: string;
  correo: string;
  password_hash: string;
  rol: 'SUPER' | 'ADMIN' | 'AUDITOR' | 'OPERADOR';
  estatus: 'activo' | 'suspendido';
  created_at: Date;
  updated_at: Date;
}

export interface UsuarioCreationAttributes extends Optional<UsuarioAttributes, 'usuario_id' | 'created_at' | 'updated_at'> {}

// Modelo
export class Usuario extends Model<UsuarioAttributes, UsuarioCreationAttributes> implements UsuarioAttributes {
  public usuario_id!: number;
  public nombre!: string;
  public apellido!: string;
  public username!: string;
  public correo!: string;
  public password_hash!: string;
  public rol!: 'SUPER' | 'ADMIN' | 'AUDITOR' | 'OPERADOR';
  public estatus!: 'activo' | 'suspendido';
  public created_at!: Date;
  public updated_at!: Date;

  // Método para obtener el nombre completo
  public getNombreCompleto(): string {
    return `${this.nombre} ${this.apellido}`;
  }

  // Método para verificar contraseña
  public async verificarPassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }

  // Método para hash de contraseña
  public static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Método para verificar si tiene permisos
  public tienePermiso(accion: string): boolean {
    const permisos = {
      SUPER: ['create', 'read', 'update', 'delete', 'admin'],
      ADMIN: ['create', 'read', 'update', 'delete'],
      AUDITOR: ['read'],
      OPERADOR: ['read', 'update'],
    };
    return permisos[this.rol]?.includes(accion) || false;
  }

  // Método para verificar si está activo
  public estaActivo(): boolean {
    return this.estatus === 'activo';
  }
}

// Definición del modelo
Usuario.init(
  {
    usuario_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    correo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.CHAR(60),
      allowNull: false,
      validate: {
        len: [60, 60],
      },
    },
    rol: {
      type: DataTypes.ENUM('SUPER', 'ADMIN', 'AUDITOR', 'OPERADOR'),
      allowNull: false,
      defaultValue: 'OPERADOR',
    },
    estatus: {
      type: DataTypes.ENUM('activo', 'suspendido'),
      allowNull: false,
      defaultValue: 'activo',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'usuario',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: async (usuario: Usuario) => {
        if (usuario.password_hash && !usuario.password_hash.startsWith('$2b$')) {
          usuario.password_hash = await Usuario.hashPassword(usuario.password_hash);
        }
      },
      beforeUpdate: async (usuario: Usuario) => {
        if (usuario.changed('password_hash') && !usuario.password_hash.startsWith('$2b$')) {
          usuario.password_hash = await Usuario.hashPassword(usuario.password_hash);
        }
      },
    },
  }
);
