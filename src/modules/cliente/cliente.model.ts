import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');

// Interfaces
export interface ClienteAttributes {
  cliente_id: number;
  tipo_persona: 'PF' | 'PF_AE' | 'PM';
  nombre?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  razon_social?: string;
  representante_legal?: string;
  rfc: string;
  curp?: string;
  fecha_nacimiento?: Date;
  fecha_constitucion?: Date;
  correo: string;
  telefono?: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  codigo_postal?: string;
  ciudad?: string;
  estado?: string;
  pais: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClienteCreationAttributes extends Optional<ClienteAttributes, 'cliente_id' | 'created_at' | 'updated_at'> {}

// Modelo
export class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes> implements ClienteAttributes {
  public cliente_id!: number;
  public tipo_persona!: 'PF' | 'PF_AE' | 'PM';
  public nombre?: string;
  public apellido_paterno?: string;
  public apellido_materno?: string;
  public razon_social?: string;
  public representante_legal?: string;
  public rfc!: string;
  public curp?: string;
  public fecha_nacimiento?: Date;
  public fecha_constitucion?: Date;
  public correo!: string;
  public telefono?: string;
  public calle?: string;
  public numero_exterior?: string;
  public numero_interior?: string;
  public colonia?: string;
  public codigo_postal?: string;
  public ciudad?: string;
  public estado?: string;
  public pais!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // Asociaciones
  public documentos?: any[];
  public solicitudes?: any[];
  public ingresos?: any[];

  // Método para obtener el nombre completo
  public getNombreCompleto(): string {
    if (this.tipo_persona === 'PM') {
      return this.razon_social || '';
    }
    return `${this.nombre || ''} ${this.apellido_paterno || ''} ${this.apellido_materno || ''}`.trim();
  }

  // Método para validar si los datos básicos están completos
  public isDatosBasicosCompletos(): boolean {
    const camposComunes = this.rfc && this.correo && this.pais;
    
    if (this.tipo_persona === 'PF' || this.tipo_persona === 'PF_AE') {
      return !!(camposComunes && this.nombre && this.apellido_paterno && this.fecha_nacimiento && this.curp);
    }
    
    if (this.tipo_persona === 'PM') {
      return !!(camposComunes && this.razon_social && this.fecha_constitucion && this.representante_legal);
    }
    
    return false;
  }

  // Método para validar si la dirección está completa
  public isDireccionCompleta(): boolean {
    return !!(this.calle && this.numero_exterior && this.colonia && 
             this.codigo_postal && this.ciudad && this.estado);
  }

  // Método para obtener el porcentaje de completitud del perfil
  public getPorcentajeCompletitud(): number {
    const camposRequeridos = this.getCamposRequeridos();
    const camposCompletos = camposRequeridos.filter(campo => this.esCampoCompleto(campo));
    return Math.round((camposCompletos.length / camposRequeridos.length) * 100);
  }

  private getCamposRequeridos(): string[] {
    const camposComunes = ['rfc', 'correo', 'telefono', 'calle', 'numero_exterior', 'colonia', 'codigo_postal', 'ciudad', 'estado', 'pais'];
    
    if (this.tipo_persona === 'PF' || this.tipo_persona === 'PF_AE') {
      return [...camposComunes, 'nombre', 'apellido_paterno', 'fecha_nacimiento', 'curp'];
    }
    
    return [...camposComunes, 'razon_social', 'fecha_constitucion', 'representante_legal'];
  }

  private esCampoCompleto(campo: string): boolean {
    const valor = (this as any)[campo];
    return valor !== null && valor !== undefined && valor !== '';
  }

  // Métodos públicos para acceso externo
  public getCamposRequeridosPublic(): string[] {
    return this.getCamposRequeridos();
  }

  public esCampoCompletoPublic(campo: string): boolean {
    return this.esCampoCompleto(campo);
  }
}

// Definición del modelo
Cliente.init(
  {
    cliente_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    tipo_persona: {
      type: DataTypes.ENUM('PF', 'PF_AE', 'PM'),
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apellido_paterno: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    apellido_materno: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    razon_social: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    representante_legal: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    rfc: {
      type: DataTypes.CHAR(13),
      allowNull: false,
      unique: true,
      validate: {
        // Validación para RFC de personas físicas (13 caracteres)
        // Formato: LLLL######LLL donde L=letra, #=número
        isValidRFC(value: string) {
          if (!value) {
            throw new Error('RFC es obligatorio');
          }
          
          // RFC de Persona Física: 4 letras + 6 números + 3 caracteres alfanuméricos
          const rfcPF = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;
          // RFC de Persona Moral: 3 letras + 6 números + 3 caracteres alfanuméricos  
          const rfcPM = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;
          
          if (!rfcPF.test(value) && !rfcPM.test(value)) {
            throw new Error('RFC no tiene un formato válido');
          }
        }
      }
    },
    curp: {
      type: DataTypes.CHAR(18),
      allowNull: true,
      validate: {
        // Validación para CURP (18 caracteres)
        // Formato: LLLL######LLLLL## donde L=letra, #=número
        isValidCURP(value: string) {
          if (value && value.trim() !== '') {
            const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/;
            if (!curpRegex.test(value)) {
              throw new Error('CURP no tiene un formato válido');
            }
          }
        }
      }
    },
    fecha_nacimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    fecha_constitucion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    correo: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    telefono: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    calle: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    numero_exterior: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    numero_interior: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
    colonia: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    codigo_postal: {
      type: DataTypes.CHAR(5),
      allowNull: true,
      validate: {
        // Validación para código postal mexicano (5 dígitos)
        isValidCP(value: string) {
          if (value && value.trim() !== '') {
            const cpRegex = /^[0-9]{5}$/;
            if (!cpRegex.test(value)) {
              throw new Error('Código postal debe tener exactamente 5 dígitos');
            }
          }
        }
      }
    },
    ciudad: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    estado: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pais: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'México',
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
    tableName: 'cliente',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_rfc_created',
        fields: ['rfc', 'created_at'],
      },
      {
        name: 'idx_codigo_postal',
        fields: ['codigo_postal'],
      },
      {
        name: 'idx_tipo_estado',
        fields: ['tipo_persona', 'estado'],
      },
    ],
    validate: {
      checkTipoDatos() {
        if ((this.tipo_persona === 'PF' || this.tipo_persona === 'PF_AE') && (!this.nombre || !this.apellido_paterno)) {
          throw new Error('Para personas físicas, nombre y apellido paterno son obligatorios');
        }
        if (this.tipo_persona === 'PM' && !this.razon_social) {
          throw new Error('Para personas morales, la razón social es obligatoria');
        }
      },
    },
  }
);

// Importar modelos relacionados para asociaciones
import { Documento } from '../documento/documento.model';
import { Solicitud } from '../solicitud/solicitud.model';

// Establecer asociaciones
Cliente.hasMany(Documento, { foreignKey: 'cliente_id', as: 'documentos' });
Cliente.hasMany(Solicitud, { foreignKey: 'cliente_id', as: 'solicitudes' });

export default Cliente;
