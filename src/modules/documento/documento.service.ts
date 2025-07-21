import { Documento } from './documento.model';
import { DocumentoTipo } from './documentoTipo.model';
import { Op, Transaction } from 'sequelize';
import { TransactionService } from '../../services/transaction.service';
import { CacheService, CacheKeys, CacheTTL } from '../../config/cache';

export class DocumentoService {
  // Crear documento con transacciones
  static async createDocumento(data: any) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Validar que el tipo de documento existe
      const tipoDocumento = await DocumentoTipo.findByPk(data.documento_tipo_id, { transaction });
      if (!tipoDocumento) {
        throw new Error('Tipo de documento no encontrado');
      }

      // Crear documento
      const documento = await Documento.create(data, { transaction });
      
      // Invalidar caché relacionado
      await CacheService.del(CacheKeys.DOCUMENTOS_CLIENTE(data.cliente_id));
      await CacheService.delPattern('documentos:*');
      
      return documento;
    });
  }

  // Procesar múltiples documentos con validaciones
  static async procesarDocumentos(documentos: any[], validaciones: any[] = []) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const documentosCreados = [];
      
      for (const documentoData of documentos) {
        // Validar tipo de documento
        const tipoDocumento = await DocumentoTipo.findByPk(documentoData.documento_tipo_id, { transaction });
        if (!tipoDocumento) {
          throw new Error(`Tipo de documento no encontrado: ${documentoData.documento_tipo_id}`);
        }

        // Crear documento
        const documento = await Documento.create(documentoData, { transaction });
        documentosCreados.push(documento);
        
        // Procesar validaciones específicas del documento
        const validacionesDocumento = validaciones.filter(v => v.documento_tipo_id === documentoData.documento_tipo_id);
        for (const validacion of validacionesDocumento) {
          // Aquí puedes agregar lógica de validación específica
          // Por ejemplo, validar formato, tamaño, etc.
        }
      }
      
      // Invalidar caché relacionado
      if (documentos.length > 0) {
        await CacheService.del(CacheKeys.DOCUMENTOS_CLIENTE(documentos[0].cliente_id));
        await CacheService.delPattern('documentos:*');
      }
      
      return documentosCreados;
    });
  }

  // Obtener documentos por cliente con caché
  static async getDocumentosByCliente(clienteId: number) {
    const cacheKey = CacheKeys.DOCUMENTOS_CLIENTE(clienteId);
    
    let documentos = await CacheService.get(cacheKey);
    
    if (!documentos) {
      documentos = await Documento.findAll({
        where: { cliente_id: clienteId },
        include: [
          {
            model: DocumentoTipo,
            as: 'tipo'
          }
        ],
        order: [['fecha_subida', 'DESC']]
      });
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, documentos, CacheTTL.SHORT * 2);
    }
    
    return documentos;
  }

  // Obtener tipos de documento con caché
  static async getTiposDocumento() {
    const cacheKey = CacheKeys.DOCUMENTO_TIPOS;
    
    let tipos = await CacheService.get(cacheKey);
    
    if (!tipos) {
      tipos = await DocumentoTipo.findAll({
        order: [['nombre', 'ASC']]
      });
      
      // Guardar en caché por 1 hora (los tipos no cambian frecuentemente)
      await CacheService.set(cacheKey, tipos, CacheTTL.LONG);
    }
    
    return tipos;
  }

  // Actualizar estatus de documento con transacciones
  static async updateEstatusDocumento(
    documentoId: number, 
    nuevoEstatus: 'pendiente' | 'aceptado' | 'rechazado' | 'vencido',
    comentarioRevisor?: string
  ) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const documento = await Documento.findByPk(documentoId, { transaction });
      if (!documento) {
        throw new Error('Documento no encontrado');
      }

      // Actualizar documento
      const updatedDocumento = await documento.update({
        estatus: nuevoEstatus,
        comentario_revisor: comentarioRevisor
      }, { transaction });
      
      // Invalidar caché relacionado
      await CacheService.del(CacheKeys.DOCUMENTOS_CLIENTE(documento.cliente_id));
      await CacheService.delPattern('documentos:*');
      
      return updatedDocumento;
    });
  }

  // Procesar lote de documentos con cambio de estatus
  static async procesarLoteDocumentos(
    documentoIds: number[], 
    nuevoEstatus: 'pendiente' | 'aceptado' | 'rechazado' | 'vencido',
    comentarioRevisor?: string
  ) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const documentosActualizados = [];
      const clientesAfectados = new Set<number>();
      
      for (const documentoId of documentoIds) {
        const documento = await Documento.findByPk(documentoId, { transaction });
        if (!documento) {
          throw new Error(`Documento no encontrado: ${documentoId}`);
        }

        const updatedDocumento = await documento.update({
          estatus: nuevoEstatus,
          comentario_revisor: comentarioRevisor
        }, { transaction });
        
        documentosActualizados.push(updatedDocumento);
        clientesAfectados.add(documento.cliente_id);
      }
      
      // Invalidar caché de todos los clientes afectados
      for (const clienteId of clientesAfectados) {
        await CacheService.del(CacheKeys.DOCUMENTOS_CLIENTE(clienteId));
      }
      await CacheService.delPattern('documentos:*');
      
      return documentosActualizados;
    });
  }

  // Eliminar documento con transacciones
  static async deleteDocumento(documentoId: number) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const documento = await Documento.findByPk(documentoId, { transaction });
      if (!documento) {
        throw new Error('Documento no encontrado');
      }

      const clienteId = documento.cliente_id;
      
      // Eliminar documento
      await documento.destroy({ transaction });
      
      // Invalidar caché relacionado
      await CacheService.del(CacheKeys.DOCUMENTOS_CLIENTE(clienteId));
      await CacheService.delPattern('documentos:*');
      
      return { message: 'Documento eliminado correctamente' };
    });
  }

  // Obtener documentos vencidos con caché
  static async getDocumentosVencidos() {
    const cacheKey = 'documentos:vencidos';
    
    let documentosVencidos = await CacheService.get(cacheKey);
    
    if (!documentosVencidos) {
      const fechaActual = new Date();
      
      documentosVencidos = await Documento.findAll({
        where: {
          fecha_expiracion: {
            [Op.lt]: fechaActual
          },
          estatus: {
            [Op.ne]: 'vencido'
          }
        },
        include: [
          {
            model: DocumentoTipo,
            as: 'tipo'
          }
        ],
        order: [['fecha_expiracion', 'ASC']]
      });
      
      // Guardar en caché por 5 minutos
      await CacheService.set(cacheKey, documentosVencidos, CacheTTL.SHORT);
    }
    
    return documentosVencidos;
  }

  // Validar completitud de documentos por cliente
  static async validarCompletitudDocumentos(clienteId: number) {
    const cacheKey = CacheKeys.COMPLETITUD_CLIENTE(clienteId);
    
    let completitud = await CacheService.get(cacheKey);
    
    if (!completitud) {
      const documentosRequeridos = await DocumentoTipo.findAll({
        where: { 
          opcional: false 
        }
      });
      
      const documentosCliente = await Documento.findAll({
        where: { 
          cliente_id: clienteId,
          estatus: 'aceptado'
        }
      });
      
      const tiposDocumentosCliente = documentosCliente.map(d => d.documento_tipo_id);
      
      const documentosFaltantes = documentosRequeridos.filter(
        tipo => !tiposDocumentosCliente.includes(tipo.documento_tipo_id)
      );
      
      completitud = {
        total_requeridos: documentosRequeridos.length,
        total_completados: documentosRequeridos.length - documentosFaltantes.length,
        porcentaje: Math.round(((documentosRequeridos.length - documentosFaltantes.length) / documentosRequeridos.length) * 100),
        documentos_faltantes: documentosFaltantes,
        esta_completo: documentosFaltantes.length === 0
      };
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, completitud, CacheTTL.SHORT * 2);
    }
    
    return completitud;
  }
}
