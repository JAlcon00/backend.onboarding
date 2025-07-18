import { DataTypes, Model, Optional } from 'sequelize';
const { sequelize } = require('../../config/database');

// Interfaces
export interface DocumentoAttributes {
  documento_id: number;
  cliente_id: number;
  documento_tipo_id: number;
  archivo_url: string;
  fecha_documento: Date;
  fecha_subida: Date;
  fecha_expiracion?: Date;
  estatus: 'pendiente' | 'aceptado' | 'rechazado' | 'vencido';
  comentario_revisor?: string;
}

export interface DocumentoCreationAttributes extends Optional<DocumentoAttributes, 'documento_id' | 'fecha_subida'> {}

// Modelo
export class Documento extends Model<DocumentoAttributes, DocumentoCreationAttributes> implements DocumentoAttributes {
  public documento_id!: number;
  public cliente_id!: number;
  public documento_tipo_id!: number;
  public archivo_url!: string;
  public fecha_documento!: Date;
  public fecha_subida!: Date;
  public fecha_expiracion?: Date;
  public estatus!: 'pendiente' | 'aceptado' | 'rechazado' | 'vencido';
  public comentario_revisor?: string;

  // Método para verificar si está vencido
  public estaVencido(): boolean {
    if (!this.fecha_expiracion) return false;
    
    // Manejo de fechas inválidas
    if (isNaN(this.fecha_expiracion.getTime())) {
      console.warn(`Fecha de expiración inválida para documento ${this.documento_id}`);
      return false;
    }
    
    const ahora = new Date();
    return ahora > this.fecha_expiracion;
  }

  // Método para calcular fecha de expiracion basada en fecha del documento
  public calcularFechaExpiracion(vigenciaDias: number): Date {
    if (!this.fecha_documento) {
      throw new Error('Fecha de documento requerida para calcular expiración');
    }
    
    if (isNaN(this.fecha_documento.getTime())) {
      throw new Error('Fecha de documento inválida');
    }
    
    if (vigenciaDias < 0) {
      throw new Error('Los días de vigencia no pueden ser negativos');
    }
    
    const fecha = new Date(this.fecha_documento);
    fecha.setDate(fecha.getDate() + vigenciaDias);
    return fecha;
  }

  // Método para verificar si el documento necesita renovación
  public necesitaRenovacion(): boolean {
    return this.estaVencido() || this.estatus === 'rechazado' || this.estatus === 'vencido';
  }

  // Método para verificar si un documento es válido para uso
  public esValido(): boolean {
    return this.estatus === 'aceptado' && !this.estaVencido();
  }

  // Método para actualizar estatus automáticamente
  public async actualizarEstatusVencimiento(): Promise<void> {
    if (this.estaVencido() && this.estatus !== 'vencido') {
      this.estatus = 'vencido';
      await this.save();
    }
  }

  // Método para obtener días hasta vencimiento
  public diasHastaVencimiento(): number | null {
    if (!this.fecha_expiracion) return null;
    
    if (isNaN(this.fecha_expiracion.getTime())) {
      return null;
    }
    
    const ahora = new Date();
    const diferencia = this.fecha_expiracion.getTime() - ahora.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  }

  // Método para verificar si el documento está próximo a vencer
  public proximoAVencer(diasAnticipacion: number = 30): boolean {
    const diasRestantes = this.diasHastaVencimiento();
    if (diasRestantes === null) return false;
    
    return diasRestantes > 0 && diasRestantes <= diasAnticipacion;
  }

  // Método para obtener el tiempo transcurrido desde la subida
  public tiempoDesdeSubida(): number {
    const ahora = new Date();
    return ahora.getTime() - this.fecha_subida.getTime();
  }

  // Método para validar el documento antes de guardarlo
  public validarDocumento(): string[] {
    const errores: string[] = [];
    
    if (!this.cliente_id) {
      errores.push('ID de cliente requerido');
    }
    
    if (!this.documento_tipo_id) {
      errores.push('Tipo de documento requerido');
    }
    
    if (!this.archivo_url || this.archivo_url.trim() === '') {
      errores.push('URL del archivo requerida');
    }
    
    if (this.archivo_url && this.archivo_url.length > 1000) {
      errores.push('URL del archivo muy larga (máximo 1000 caracteres)');
    }
    
    if (!this.fecha_documento) {
      errores.push('Fecha del documento requerida');
    }
    
    // Convertir fecha_documento a Date si es string antes de validar
    if (this.fecha_documento) {
      const fechaDocumento = this.fecha_documento instanceof Date ? this.fecha_documento : new Date(this.fecha_documento);
      if (isNaN(fechaDocumento.getTime())) {
        errores.push('Fecha del documento inválida');
      }
    }
    
    if (this.comentario_revisor && this.comentario_revisor.length > 500) {
      errores.push('Comentario del revisor muy largo (máximo 500 caracteres)');
    }
    
    if (this.fecha_expiracion) {
      const fechaExpiracion = this.fecha_expiracion instanceof Date ? this.fecha_expiracion : new Date(this.fecha_expiracion);
      if (isNaN(fechaExpiracion.getTime())) {
        errores.push('Fecha de expiración inválida');
      }
    }
    
    return errores;
  }

  // MÉTODOS ESTÁTICOS
  
  /**
   * Obtiene documentos que están próximos a vencer
   */
  static async getDocumentosProximosAVencer(
    diasAnticipacion: number = 30,
    incluirVencidos: boolean = false
  ): Promise<Documento[]> {
    const { Op } = require('sequelize');
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);
    
    const whereCondition: any = {
      fecha_expiracion: {
        [Op.lte]: fechaLimite,
        [Op.ne]: null
      }
    };
    
    if (!incluirVencidos) {
      whereCondition.fecha_expiracion[Op.gte] = new Date();
    }
    
    return await Documento.findAll({
      where: whereCondition,
      order: [['fecha_expiracion', 'ASC']]
    });
  }

  /**
   * Obtiene documentos por cliente y estado
   */
  static async getDocumentosPorClienteYEstado(
    clienteId: number,
    estatus?: string[]
  ): Promise<Documento[]> {
    const whereCondition: any = { cliente_id: clienteId };
    
    if (estatus && estatus.length > 0) {
      const { Op } = require('sequelize');
      whereCondition.estatus = { [Op.in]: estatus };
    }
    
    return await Documento.findAll({
      where: whereCondition,
      order: [['fecha_subida', 'DESC']]
    });
  }

  /**
   * Actualiza masivamente documentos vencidos
   */
  static async actualizarDocumentosVencidos(): Promise<number> {
    const { Op } = require('sequelize');
    const ahora = new Date();
    
    const [affectedCount] = await Documento.update(
      { estatus: 'vencido' },
      {
        where: {
          fecha_expiracion: { [Op.lt]: ahora },
          estatus: { [Op.ne]: 'vencido' }
        }
      }
    );
    
    return affectedCount;
  }

  /**
   * Obtiene estadísticas de documentos por cliente
   */
  static async getEstadisticasPorCliente(clienteId: number): Promise<{
    total: number;
    pendientes: number;
    aceptados: number;
    rechazados: number;
    vencidos: number;
    proximosAVencer: number;
  }> {
    const { Op } = require('sequelize');
    const sequelize = require('../../config/database').sequelize;
    
    const resultado = await sequelize.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estatus = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estatus = 'aceptado' THEN 1 ELSE 0 END) as aceptados,
        SUM(CASE WHEN estatus = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
        SUM(CASE WHEN estatus = 'vencido' THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE 
          WHEN fecha_expiracion IS NOT NULL 
               AND fecha_expiracion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
               AND estatus = 'aceptado'
          THEN 1 ELSE 0 END) as proximosAVencer
      FROM documento 
      WHERE cliente_id = :clienteId
    `, {
      replacements: { clienteId },
      type: sequelize.QueryTypes.SELECT
    });
    
    const stats = resultado[0] as any;
    return {
      total: parseInt(stats.total) || 0,
      pendientes: parseInt(stats.pendientes) || 0,
      aceptados: parseInt(stats.aceptados) || 0,
      rechazados: parseInt(stats.rechazados) || 0,
      vencidos: parseInt(stats.vencidos) || 0,
      proximosAVencer: parseInt(stats.proximosAVencer) || 0,
    };
  }

  /**
   * Limpia documentos antiguos (soft delete o marcado)
   */
  static async limpiarDocumentosAntiguos(diasAntiguedad: number = 365): Promise<number> {
    const { Op } = require('sequelize');
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);
    
    // En lugar de eliminar, podrías marcar como archivados
    // o mover a una tabla de archivo
    const documentosAntiguos = await Documento.findAll({
      where: {
        fecha_subida: { [Op.lt]: fechaLimite },
        estatus: { [Op.in]: ['rechazado', 'vencido'] }
      }
    });
    
    return documentosAntiguos.length;
  }
}

// Definición del modelo
Documento.init(
  {
    documento_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    cliente_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    documento_tipo_id: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    archivo_url: {
      type: DataTypes.STRING(1000),
      allowNull: false,
    },
    fecha_documento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fecha_subida: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fecha_expiracion: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    estatus: {
      type: DataTypes.ENUM('pendiente', 'aceptado', 'rechazado', 'vencido'),
      allowNull: false,
      defaultValue: 'pendiente',
    },
    comentario_revisor: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'documento',
    timestamps: false,
    indexes: [
      {
        name: 'idx_cliente_tipo',
        fields: ['cliente_id', 'documento_tipo_id'],
      },
      {
        name: 'idx_expiracion',
        fields: ['fecha_expiracion'],
      },
      {
        name: 'idx_estatus',
        fields: ['estatus'],
      },
    ],
    hooks: {
      beforeValidate: (documento: Documento) => {
        // Validar datos antes de guardar
        const errores = documento.validarDocumento();
        if (errores.length > 0) {
          throw new Error(`Errores de validación: ${errores.join(', ')}`);
        }
      },
      beforeCreate: (documento: Documento) => {
        // Normalizar datos antes de crear
        if (documento.archivo_url) {
          documento.archivo_url = documento.archivo_url.trim();
        }
        if (documento.comentario_revisor) {
          documento.comentario_revisor = documento.comentario_revisor.trim();
        }
      },
      beforeUpdate: (documento: Documento) => {
        // Normalizar datos antes de actualizar
        if (documento.archivo_url) {
          documento.archivo_url = documento.archivo_url.trim();
        }
        if (documento.comentario_revisor) {
          documento.comentario_revisor = documento.comentario_revisor.trim();
        }
      },
      afterUpdate: (documento: Documento) => {
        // Log de cambios importantes
        if (documento.changed('estatus')) {
          console.log(`Documento ${documento.documento_id} cambió estatus a: ${documento.estatus}`);
        }
      }
    }
  }
);

// Importar modelos relacionados para asociaciones
import { Cliente } from '../cliente/cliente.model';
import { DocumentoTipo } from './documentoTipo.model';

// Establecer asociaciones
Documento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'clienteDocumento' });
Documento.belongsTo(DocumentoTipo, { foreignKey: 'documento_tipo_id', as: 'tipo' });

export default Documento;
