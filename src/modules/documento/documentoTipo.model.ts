import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');

// Interfaces
export interface DocumentoTipoAttributes {
  documento_tipo_id: number;
  nombre: string;
  aplica_pf: boolean;
  aplica_pfae: boolean;
  aplica_pm: boolean;
  vigencia_dias?: number;
  opcional: boolean;
}

export interface DocumentoTipoCreationAttributes extends Optional<DocumentoTipoAttributes, 'documento_tipo_id'> {}

// Modelo
export class DocumentoTipo extends Model<DocumentoTipoAttributes, DocumentoTipoCreationAttributes> implements DocumentoTipoAttributes {
  public documento_tipo_id!: number;
  public nombre!: string;
  public aplica_pf!: boolean;
  public aplica_pfae!: boolean;
  public aplica_pm!: boolean;
  public vigencia_dias?: number;
  public opcional!: boolean;

  // Método para verificar si aplica a un tipo de persona
  public aplicaATipoPersona(tipoPersona: 'PF' | 'PF_AE' | 'PM'): boolean {
    switch (tipoPersona) {
      case 'PF':
        return this.aplica_pf;
      case 'PF_AE':
        return this.aplica_pfae;
      case 'PM':
        return this.aplica_pm;
      default:
        return false;
    }
  }

  // Método para calcular fecha de expiración basada en fecha del documento
  public calcularFechaExpiracion(fechaDocumento: Date): Date | null {
    if (!this.vigencia_dias) return null;
    
    const fecha = new Date(fechaDocumento);
    fecha.setDate(fecha.getDate() + this.vigencia_dias);
    return fecha;
  }

  // Método para verificar si es documento de "una vez" (no caduca)
  public esDocumentoUnaVez(): boolean {
    return !this.vigencia_dias;
  }

  // Método para obtener descripción de vigencia
  public getDescripcionVigencia(): string {
    if (!this.vigencia_dias) {
      return 'Una vez (no caduca)';
    }
    if (this.vigencia_dias === 30) {
      return '30 días naturales';
    }
    if (this.vigencia_dias === 90) {
      return '3 meses';
    }
    if (this.vigencia_dias === 365) {
      return '1 año';
    }
    if (this.vigencia_dias === 730) {
      return '2 años';
    }
    return `${this.vigencia_dias} días`;
  }

  // Método para verificar si el documento necesita renovación frecuente
  // Basado en lógica de negocio según los tipos de documento
  public necesitaRenovacionPorSolicitud(): boolean {
    const documentosRenovables = [
      'Comprobante de Ingresos',
      'Pasivos Bancarios',
      'Carátula Estado de Cuenta',
      'Declaración de Impuestos (2 últimas)',
      'Carátula Estado de Cuenta (PM)',
      'Pasivos Bancarios (PM)'
    ];
    
    return documentosRenovables.includes(this.nombre);
  }
}

// Definición del modelo
DocumentoTipo.init(
  {
    documento_tipo_id: {
      type: DataTypes.TINYINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    aplica_pf: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aplica_pfae: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    aplica_pm: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    vigencia_dias: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: true,
    },
    opcional: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'documento_tipo',
    timestamps: false,
    indexes: [
      {
        name: 'idx_tipo_persona',
        fields: ['aplica_pf', 'aplica_pfae', 'aplica_pm'],
      },
      {
        name: 'idx_vigencia',
        fields: ['vigencia_dias'],
      },
    ],
    validate: {
      // Validar que al menos un tipo de persona esté seleccionado
      alMenosUnTipoPersona() {
        if (!this.aplica_pf && !this.aplica_pfae && !this.aplica_pm) {
          throw new Error('Debe aplicar al menos a un tipo de persona');
        }
      },
    },
  }
);

// Importar modelos relacionados para asociaciones
import { Documento } from './documento.model';

// Establecer asociaciones
DocumentoTipo.hasMany(Documento, { foreignKey: 'documento_tipo_id', as: 'documentos' });

export default DocumentoTipo;
