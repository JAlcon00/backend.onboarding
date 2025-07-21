import { Solicitud } from './solicitud.model';
import { SolicitudProducto } from './solicitudProducto.model';
import { Cliente } from '../cliente/cliente.model';
import { DocumentoService } from '../documento/documento.service';
import { Op, Transaction } from 'sequelize';
import { TransactionService } from '../../services/transaction.service';
import { CacheService, CacheKeys, CacheTTL } from '../../config/cache';
import { logError, logInfo, logDebug } from '../../config/logger';
const { sequelize } = require('../../config/database');

export class SolicitudService {
  // Crear solicitud con productos en una transacción
  static async createSolicitud(solicitudData: any, productos: any[] = []) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Verificar que el cliente existe
      const cliente = await Cliente.findByPk(solicitudData.cliente_id, { transaction });
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Crear solicitud
      const solicitud = await Solicitud.create(solicitudData, { transaction });
      
      // Crear productos asociados
      if (productos.length > 0) {
        for (const productoData of productos) {
          await SolicitudProducto.create({
            ...productoData,
            solicitud_id: solicitud.solicitud_id
          }, { transaction });
        }
      }
      
      // Invalidar caché relacionado
      await CacheService.del(CacheKeys.SOLICITUDES_CLIENTE(solicitudData.cliente_id));
      await CacheService.delPattern('solicitudes:*');
      
      logInfo('Solicitud creada exitosamente', { 
        solicitud_id: solicitud.solicitud_id, 
        cliente_id: solicitudData.cliente_id 
      });
      
      return solicitud;
    });
  }

  // Obtener solicitudes por cliente con caché
  static async getSolicitudesByCliente(clienteId: number) {
    const cacheKey = CacheKeys.SOLICITUDES_CLIENTE(clienteId);
    
    let solicitudes = await CacheService.get(cacheKey);
    
    if (!solicitudes) {
      solicitudes = await Solicitud.findAll({
        where: { cliente_id: clienteId },
        include: [
          {
            model: SolicitudProducto,
            as: 'productos'
          },
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['cliente_id', 'nombre', 'apellido_paterno', 'razon_social']
          }
        ],
        order: [['fecha_creacion', 'DESC']]
      });
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, solicitudes, CacheTTL.SHORT * 2);
    }
    
    return solicitudes;
  }

  // Obtener solicitud por ID con caché
  static async getSolicitudById(solicitudId: number) {
    const cacheKey = `solicitud:${solicitudId}`;
    
    let solicitud = await CacheService.get(cacheKey);
    
    if (!solicitud) {
      solicitud = await Solicitud.findByPk(solicitudId, {
        include: [
          {
            model: SolicitudProducto,
            as: 'productos'
          },
          {
            model: Cliente,
            as: 'cliente'
          }
        ]
      });
      
      if (solicitud) {
        // Guardar en caché por 15 minutos
        await CacheService.set(cacheKey, solicitud, CacheTTL.MEDIUM);
      }
    }
    
    return solicitud;
  }

  // Actualizar estatus de solicitud con validaciones
  static async updateEstatusSolicitud(
    solicitudId: number,
    nuevoEstatus: 'iniciada' | 'en_revision' | 'aprobada' | 'rechazada' | 'cancelada',
    comentario?: string,
    usuarioId?: number
  ) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const solicitud = await Solicitud.findByPk(solicitudId, { transaction });
      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      // Validar transición de estatus
      if (!this.validarTransicionEstatus(solicitud.estatus, nuevoEstatus)) {
        throw new Error(`Transición de estatus no válida: ${solicitud.estatus} -> ${nuevoEstatus}`);
      }

      // Actualizar solicitud
      const updatedSolicitud = await solicitud.update({
        estatus: nuevoEstatus
      }, { transaction });
      
      // Invalidar caché
      await CacheService.del(`solicitud:${solicitudId}`);
      await CacheService.del(CacheKeys.SOLICITUDES_CLIENTE(solicitud.cliente_id));
      await CacheService.delPattern('solicitudes:*');
      
      logInfo('Estatus de solicitud actualizado', {
        solicitud_id: solicitudId,
        estatus_anterior: solicitud.estatus,
        estatus_nuevo: nuevoEstatus,
        usuario_id: usuarioId,
        comentario: comentario
      });
      
      return updatedSolicitud;
    });
  }

  // Procesar múltiples solicitudes (aprobación/rechazo en lote)
  static async procesarLoteSolicitudes(
    solicitudIds: number[],
    nuevoEstatus: 'aprobada' | 'rechazada',
    comentario?: string,
    usuarioId?: number
  ) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const solicitudesActualizadas = [];
      const clientesAfectados = new Set<number>();
      
      for (const solicitudId of solicitudIds) {
        const solicitud = await Solicitud.findByPk(solicitudId, { transaction });
        if (!solicitud) {
          throw new Error(`Solicitud no encontrada: ${solicitudId}`);
        }

        // Validar transición de estatus
        if (!this.validarTransicionEstatus(solicitud.estatus, nuevoEstatus)) {
          throw new Error(`Transición de estatus no válida para solicitud ${solicitudId}: ${solicitud.estatus} -> ${nuevoEstatus}`);
        }

        const updatedSolicitud = await solicitud.update({
          estatus: nuevoEstatus
        }, { transaction });
        
        solicitudesActualizadas.push(updatedSolicitud);
        clientesAfectados.add(solicitud.cliente_id);
      }
      
      // Invalidar caché de todos los clientes afectados
      for (const clienteId of clientesAfectados) {
        await CacheService.del(CacheKeys.SOLICITUDES_CLIENTE(clienteId));
      }
      await CacheService.delPattern('solicitudes:*');
      
      logInfo('Lote de solicitudes procesado', {
        solicitudes_procesadas: solicitudIds.length,
        estatus_nuevo: nuevoEstatus,
        usuario_id: usuarioId,
        comentario: comentario
      });
      
      return solicitudesActualizadas;
    });
  }

  // Validar completitud de solicitud
  static async validarCompletitudSolicitud(solicitudId: number) {
    const cacheKey = `completitud:solicitud:${solicitudId}`;
    
    let completitud = await CacheService.get(cacheKey);
    
    if (!completitud) {
      const solicitud = await this.getSolicitudById(solicitudId);
      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      // Validar documentos requeridos
      const documentosCompletitud = await DocumentoService.validarCompletitudDocumentos(solicitud.cliente_id);
      
      // Validar productos
      const productosCompletos = solicitud.productos && solicitud.productos.length > 0;
      
      // Validar datos del cliente
      const clienteCompleto = solicitud.cliente.getPorcentajeCompletitud() >= 80;
      
      completitud = {
        documentos_completos: documentosCompletitud.esta_completo,
        productos_definidos: productosCompletos,
        cliente_completo: clienteCompleto,
        puede_proceder: documentosCompletitud.esta_completo && productosCompletos && clienteCompleto,
        porcentaje_completitud: Math.round(
          ((documentosCompletitud.esta_completo ? 1 : 0) + 
           (productosCompletos ? 1 : 0) + 
           (clienteCompleto ? 1 : 0)) / 3 * 100
        ),
        detalles: {
          documentos: documentosCompletitud,
          productos: solicitud.productos || [],
          cliente_porcentaje: solicitud.cliente.getPorcentajeCompletitud()
        }
      };
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, completitud, CacheTTL.SHORT * 2);
    }
    
    return completitud;
  }

  // Obtener estadísticas de solicitudes
  static async getEstadisticasSolicitudes() {
    const cacheKey = 'estadisticas:solicitudes';
    
    let estadisticas = await CacheService.get(cacheKey);
    
    if (!estadisticas) {
      const totalSolicitudes = await Solicitud.count();
      
      const solicitudesPorEstatus = await Solicitud.findAll({
        attributes: [
          'estatus',
          [sequelize.fn('COUNT', sequelize.col('solicitud_id')), 'total']
        ],
        group: ['estatus'],
        raw: true
      });
      
      const solicitudesUltimos30Dias = await Solicitud.count({
        where: {
          fecha_creacion: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });
      
      estadisticas = {
        total_solicitudes: totalSolicitudes,
        solicitudes_por_estatus: solicitudesPorEstatus,
        solicitudes_ultimo_mes: solicitudesUltimos30Dias,
        fecha_actualizacion: new Date().toISOString()
      };
      
      // Guardar en caché por 1 hora
      await CacheService.set(cacheKey, estadisticas, CacheTTL.LONG);
    }
    
    return estadisticas;
  }

  // Eliminar solicitud con validaciones
  static async deleteSolicitud(solicitudId: number, usuarioId?: number) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const solicitud = await Solicitud.findByPk(solicitudId, { transaction });
      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      // Solo permitir eliminación si está en estado inicial
      if (solicitud.estatus !== 'iniciada') {
        throw new Error('Solo se pueden eliminar solicitudes en estado iniciado');
      }

      const clienteId = solicitud.cliente_id;
      
      // Eliminar productos asociados
      await SolicitudProducto.destroy({
        where: { solicitud_id: solicitudId },
        transaction
      });
      
      // Eliminar solicitud
      await solicitud.destroy({ transaction });
      
      // Invalidar caché
      await CacheService.del(`solicitud:${solicitudId}`);
      await CacheService.del(CacheKeys.SOLICITUDES_CLIENTE(clienteId));
      await CacheService.delPattern('solicitudes:*');
      
      logInfo('Solicitud eliminada', {
        solicitud_id: solicitudId,
        usuario_id: usuarioId
      });
      
      return { message: 'Solicitud eliminada correctamente' };
    });
  }

  // Validar transición de estatus
  private static validarTransicionEstatus(estatusActual: string, nuevoEstatus: string): boolean {
    const transicionesValidas: Record<string, string[]> = {
      'iniciada': ['en_revision', 'cancelada'],
      'en_revision': ['aprobada', 'rechazada', 'cancelada'],
      'aprobada': ['cancelada'],
      'rechazada': ['en_revision', 'cancelada'],
      'cancelada': []
    };
    
    return transicionesValidas[estatusActual]?.includes(nuevoEstatus) || false;
  }

  // Obtener solicitudes pendientes de revisión
  static async getSolicitudesPendientesRevision() {
    const cacheKey = 'solicitudes:pendientes_revision';
    
    let solicitudes = await CacheService.get(cacheKey);
    
    if (!solicitudes) {
      solicitudes = await Solicitud.findAll({
        where: { estatus: 'en_revision' },
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['cliente_id', 'nombre', 'apellido_paterno', 'razon_social']
          },
          {
            model: SolicitudProducto,
            as: 'productos'
          }
        ],
        order: [['fecha_creacion', 'ASC']]
      });
      
      // Guardar en caché por 5 minutos
      await CacheService.set(cacheKey, solicitudes, CacheTTL.SHORT);
    }
    
    return solicitudes;
  }
}
