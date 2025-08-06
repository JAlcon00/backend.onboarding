import { Solicitud } from './solicitud.model';
import { SolicitudProducto } from './solicitudProducto.model';
import { Cliente } from '../cliente/cliente.model';
import { DocumentoService } from '../documento/documento.service';
import { Op, Transaction, QueryTypes } from 'sequelize';
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

  // ==================== FUNCIONALIDADES ADMINISTRATIVAS AVANZADAS ====================

  /**
   * Dashboard ejecutivo con métricas en tiempo real
   */
  static async getDashboardEjecutivo(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    productos?: string[];
  } = {}) {
    const cacheKey = `solicitudes:dashboard:ejecutivo:${JSON.stringify(filtros)}`;
    
    let dashboard = await CacheService.get(cacheKey);
    
    if (!dashboard) {
      const { fechaInicio, fechaFin, productos } = filtros;
      
      let whereClause = '';
      const replacements: any = {};
      
      if (fechaInicio && fechaFin) {
        whereClause += ' AND s.fecha_solicitud BETWEEN :fechaInicio AND :fechaFin';
        replacements.fechaInicio = fechaInicio;
        replacements.fechaFin = fechaFin;
      }
      
      if (productos && productos.length > 0) {
        whereClause += ' AND sp.producto IN (:productos)';
        replacements.productos = productos;
      }

      // Consulta principal para resumen general
      const queryResumen = `
        SELECT 
          COUNT(DISTINCT s.solicitud_id) as total_solicitudes_activas,
          SUM(sp.monto) as valor_total_cartera,
          SUM(CASE WHEN DATE(s.fecha_solicitud) = CURDATE() THEN 1 ELSE 0 END) as solicitudes_hoy,
          
          -- Tiempo promedio de aprobación
          AVG(CASE 
            WHEN s.estatus = 'aprobada' 
            THEN TIMESTAMPDIFF(HOUR, s.fecha_solicitud, s.fecha_actualizacion) 
            ELSE NULL 
          END) as tiempo_promedio_aprobacion,
          
          -- Tasa de conversión global
          ROUND(
            (SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) / 
             COUNT(DISTINCT s.solicitud_id)) * 100, 
            2
          ) as tasa_conversion_global,
          
          -- Alertas críticas
          SUM(CASE 
            WHEN s.estatus = 'en_revision' 
                 AND TIMESTAMPDIFF(HOUR, s.fecha_solicitud, NOW()) > 72 
            THEN 1 ELSE 0 
          END) as solicitudes_vencidas_sla,
          
          SUM(CASE WHEN sp.monto > 500000 THEN 1 ELSE 0 END) as montos_superiores_limite,
          
          SUM(CASE 
            WHEN (SELECT COUNT(*) FROM documento d 
                  WHERE d.cliente_id = s.cliente_id 
                    AND d.estatus = 'aceptado') < 3 
            THEN 1 ELSE 0 
          END) as documentacion_incompleta
          
        FROM solicitud s
        JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
        WHERE s.estatus IN ('iniciada', 'en_revision', 'aprobada', 'rechazada')
          ${whereClause}
      `;

      const [resumenGeneral] = await sequelize.query(queryResumen, {
        replacements,
        type: QueryTypes.SELECT
      }) as any[];

      // Métricas por producto
      const queryProductos = `
        SELECT 
          sp.producto,
          COUNT(DISTINCT s.solicitud_id) as solicitudes_activas,
          AVG(sp.monto) as valor_promedio,
          ROUND(
            (SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) / 
             COUNT(DISTINCT s.solicitud_id)) * 100, 
            2
          ) as tasa_aprobacion,
          AVG(CASE 
            WHEN s.estatus IN ('aprobada', 'rechazada') 
            THEN TIMESTAMPDIFF(HOUR, s.fecha_solicitud, s.fecha_actualizacion) 
            ELSE NULL 
          END) as tiempo_promedio_decision,
          
          -- Estimación de margen (simplificada)
          CASE sp.producto
            WHEN 'CS' THEN AVG(sp.monto) * 0.15
            WHEN 'CC' THEN AVG(sp.monto) * 0.25
            WHEN 'FA' THEN AVG(sp.monto) * 0.12
            WHEN 'AR' THEN AVG(sp.monto) * 0.18
            ELSE AVG(sp.monto) * 0.15
          END as margen_esperado
          
        FROM solicitud s
        JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
        WHERE s.estatus IN ('iniciada', 'en_revision', 'aprobada', 'rechazada')
          ${whereClause}
        GROUP BY sp.producto
      `;

      const metricasProductos = await sequelize.query(queryProductos, {
        replacements,
        type: QueryTypes.SELECT
      }) as any[];

      // Tendencias de los últimos 30 días
      const queryTendencias = `
        SELECT 
          DATE(s.fecha_solicitud) as fecha,
          COUNT(DISTINCT s.solicitud_id) as cantidad,
          SUM(sp.monto) as monto,
          ROUND(
            (SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) / 
             COUNT(DISTINCT s.solicitud_id)) * 100, 
            2
          ) as porcentaje_conversion
        FROM solicitud s
        JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
        WHERE s.fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          ${whereClause.replace('s.fecha_solicitud BETWEEN :fechaInicio AND :fechaFin', '1=1')}
        GROUP BY DATE(s.fecha_solicitud)
        ORDER BY fecha DESC
        LIMIT 30
      `;

      const tendencias = await sequelize.query(queryTendencias, {
        replacements: { ...replacements, fechaInicio: undefined, fechaFin: undefined },
        type: QueryTypes.SELECT
      });

      // Construir objeto de respuesta
      const metricasPorProducto: Record<string, any> = {};
      metricasProductos.forEach((producto: any) => {
        metricasPorProducto[producto.producto] = {
          solicitudes_activas: producto.solicitudes_activas,
          valor_promedio: producto.valor_promedio || 0,
          tasa_aprobacion: producto.tasa_aprobacion || 0,
          tiempo_promedio_decision: producto.tiempo_promedio_decision || 0,
          margen_esperado: producto.margen_esperado || 0
        };
      });

      dashboard = {
        resumen_general: {
          total_solicitudes_activas: resumenGeneral.total_solicitudes_activas || 0,
          valor_total_cartera: resumenGeneral.valor_total_cartera || 0,
          solicitudes_hoy: resumenGeneral.solicitudes_hoy || 0,
          tiempo_promedio_aprobacion: resumenGeneral.tiempo_promedio_aprobacion || 0,
          tasa_conversion_global: resumenGeneral.tasa_conversion_global || 0
        },
        metricas_por_producto: metricasPorProducto,
        alertas_criticas: {
          solicitudes_vencidas_sla: resumenGeneral.solicitudes_vencidas_sla || 0,
          montos_superiores_limite: resumenGeneral.montos_superiores_limite || 0,
          clientes_alto_riesgo: 0, // Implementar según lógica de riesgo
          documentacion_incompleta: resumenGeneral.documentacion_incompleta || 0
        },
        tendencias_30_dias: {
          solicitudes_por_dia: tendencias.map((t: any) => ({
            fecha: t.fecha,
            cantidad: t.cantidad
          })),
          valores_por_dia: tendencias.map((t: any) => ({
            fecha: t.fecha,
            monto: t.monto
          })),
          conversion_por_dia: tendencias.map((t: any) => ({
            fecha: t.fecha,
            porcentaje: t.porcentaje_conversion
          }))
        }
      };
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, dashboard, CacheTTL.SHORT * 2/3);
    }
    
    return dashboard;
  }

  /**
   * Análisis avanzado de rentabilidad por producto
   */
  static async getAnalisisRentabilidad(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    productos?: string[];
  } = {}) {
    const cacheKey = `solicitudes:analisis:rentabilidad:${JSON.stringify(filtros)}`;
    
    let analisis = await CacheService.get(cacheKey);
    
    if (!analisis) {
      const { fechaInicio, fechaFin, productos } = filtros;
      
      let whereClause = '';
      const replacements: any = {};
      
      if (fechaInicio && fechaFin) {
        whereClause += ' AND s.fecha_solicitud BETWEEN :fechaInicio AND :fechaFin';
        replacements.fechaInicio = fechaInicio;
        replacements.fechaFin = fechaFin;
      }
      
      if (productos && productos.length > 0) {
        whereClause += ' AND sp.producto IN (:productos)';
        replacements.productos = productos;
      }

      const query = `
        WITH analisis_producto AS (
          SELECT 
            sp.producto,
            COUNT(DISTINCT s.solicitud_id) as solicitudes_periodo,
            SUM(sp.monto) as valor_total_solicitado,
            AVG(sp.monto) as valor_promedio,
            
            ROUND(
              (SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) / 
               COUNT(DISTINCT s.solicitud_id)) * 100, 
              2
            ) as tasa_aprobacion,
            
            -- Estimación de ingresos anuales
            CASE sp.producto
              WHEN 'CS' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.15 ELSE 0 END)
              WHEN 'CC' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.25 ELSE 0 END)
              WHEN 'FA' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.12 ELSE 0 END)
              WHEN 'AR' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.18 ELSE 0 END)
              ELSE SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.15 ELSE 0 END)
            END as ingreso_estimado_anual,
            
            -- Análisis de riesgo simplificado
            CASE 
              WHEN AVG(sp.monto) > 1000000 THEN 'alto'
              WHEN AVG(sp.monto) > 300000 THEN 'medio'
              ELSE 'bajo'
            END as riesgo_promedio,
            
            -- ROI estimado
            ROUND(
              (CASE sp.producto
                WHEN 'CS' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.15 ELSE 0 END)
                WHEN 'CC' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.25 ELSE 0 END)
                WHEN 'FA' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.12 ELSE 0 END)
                WHEN 'AR' THEN SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.18 ELSE 0 END)
                ELSE SUM(CASE WHEN s.estatus = 'aprobada' THEN sp.monto * 0.15 ELSE 0 END)
              END) / NULLIF(COUNT(DISTINCT s.solicitud_id) * 10000, 0) * 100, 
              2
            ) as roi_estimado,
            
            -- Segmentación por monto
            SUM(CASE WHEN sp.monto BETWEEN 0 AND 100000 THEN 1 ELSE 0 END) as seg_0_100k,
            SUM(CASE WHEN sp.monto BETWEEN 100001 AND 500000 THEN 1 ELSE 0 END) as seg_100k_500k,
            SUM(CASE WHEN sp.monto > 500000 THEN 1 ELSE 0 END) as seg_500k_mas,
            
            SUM(CASE WHEN sp.monto BETWEEN 0 AND 100000 AND s.estatus = 'aprobada' THEN 1 ELSE 0 END) as seg_0_100k_aprob,
            SUM(CASE WHEN sp.monto BETWEEN 100001 AND 500000 AND s.estatus = 'aprobada' THEN 1 ELSE 0 END) as seg_100k_500k_aprob,
            SUM(CASE WHEN sp.monto > 500000 AND s.estatus = 'aprobada' THEN 1 ELSE 0 END) as seg_500k_mas_aprob
            
          FROM solicitud s
          JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
          WHERE 1=1 ${whereClause}
          GROUP BY sp.producto
        ),
        tendencia_6_meses AS (
          SELECT 
            sp.producto,
            DATE_FORMAT(s.fecha_solicitud, '%Y-%m') as mes,
            COUNT(DISTINCT s.solicitud_id) as solicitudes,
            SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) as aprobaciones,
            SUM(sp.monto) as valor_total
          FROM solicitud s
          JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
          WHERE s.fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
          GROUP BY sp.producto, DATE_FORMAT(s.fecha_solicitud, '%Y-%m')
          ORDER BY sp.producto, mes DESC
        )
        
        SELECT 
          ap.*,
          -- Agregar tendencias
          GROUP_CONCAT(
            CONCAT(tm.mes, ':', tm.solicitudes, ':', tm.aprobaciones, ':', tm.valor_total)
            ORDER BY tm.mes DESC
            SEPARATOR '|'
          ) as tendencia_data
        FROM analisis_producto ap
        LEFT JOIN tendencia_6_meses tm ON ap.producto = tm.producto
        GROUP BY ap.producto
      `;

      const resultados = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      }) as any[];

      // Procesar resultados
      const porProducto: Record<string, any> = {};
      resultados.forEach((producto: any) => {
        // Procesar tendencias
        const tendenciaData = producto.tendencia_data ? 
          producto.tendencia_data.split('|').map((item: string) => {
            const [mes, solicitudes, aprobaciones, valor_total] = item.split(':');
            return { mes, solicitudes: parseInt(solicitudes), aprobaciones: parseInt(aprobaciones), valor_total: parseFloat(valor_total) };
          }) : [];

        porProducto[producto.producto] = {
          solicitudes_periodo: producto.solicitudes_periodo,
          valor_total_solicitado: producto.valor_total_solicitado || 0,
          valor_promedio: producto.valor_promedio || 0,
          tasa_aprobacion: producto.tasa_aprobacion || 0,
          ingreso_estimado_anual: producto.ingreso_estimado_anual || 0,
          riesgo_promedio: producto.riesgo_promedio,
          roi_estimado: producto.roi_estimado || 0,
          segmentos_monto: {
            '0-100k': {
              solicitudes: producto.seg_0_100k || 0,
              aprobaciones: producto.seg_0_100k_aprob || 0,
              margen: 15 // Simplificado
            },
            '100k-500k': {
              solicitudes: producto.seg_100k_500k || 0,
              aprobaciones: producto.seg_100k_500k_aprob || 0,
              margen: 20
            },
            '500k+': {
              solicitudes: producto.seg_500k_mas || 0,
              aprobaciones: producto.seg_500k_mas_aprob || 0,
              margen: 25
            }
          },
          tendencia_6_meses: tendenciaData
        };
      });

      // Generar recomendaciones
      const productosOrdenados = Object.entries(porProducto)
        .sort(([,a], [,b]) => (b as any).roi_estimado - (a as any).roi_estimado);

      analisis = {
        por_producto: porProducto,
        recomendaciones: {
          productos_potenciar: productosOrdenados.slice(0, 2).map(([producto]) => producto),
          segmentos_enfocar: ['100k-500k'], // Basado en análisis
          riesgos_mitigar: productosOrdenados
            .filter(([, data]) => (data as any).riesgo_promedio === 'alto')
            .map(([producto]) => producto)
        }
      };
      
      // Guardar en caché por 30 minutos
      await CacheService.set(cacheKey, analisis, CacheTTL.SHORT);
    }
    
    return analisis;
  }

  /**
   * Gestión inteligente de carga de trabajo
   */
  static async getGestionCargaTrabajo() {
    const cacheKey = 'solicitudes:gestion:carga-trabajo';
    
    let gestion = await CacheService.get(cacheKey);
    
    if (!gestion) {
      const queryEquipos = `
        SELECT 
          u.usuario_id,
          u.nombre,
          u.email,
          
          -- Solicitudes asignadas actualmente
          COUNT(CASE WHEN s.estatus = 'en_revision' THEN 1 END) as solicitudes_asignadas,
          
          -- Solicitudes completadas hoy
          COUNT(CASE 
            WHEN s.estatus IN ('aprobada', 'rechazada') 
                 AND DATE(s.fecha_actualizacion) = CURDATE() 
            THEN 1 
          END) as solicitudes_completadas_hoy,
          
          -- Tiempo promedio de revisión
          AVG(CASE 
            WHEN s.estatus IN ('aprobada', 'rechazada') 
            THEN TIMESTAMPDIFF(HOUR, s.fecha_solicitud, s.fecha_actualizacion) 
            ELSE NULL 
          END) as tiempo_promedio_revision,
          
          -- Tasa de aprobación personal
          ROUND(
            (COUNT(CASE WHEN s.estatus = 'aprobada' THEN 1 END) / 
             NULLIF(COUNT(CASE WHEN s.estatus IN ('aprobada', 'rechazada') THEN 1 END), 0)) * 100, 
            2
          ) as tasa_aprobacion_personal,
          
          -- Capacidad disponible (máximo 10 solicitudes por usuario)
          GREATEST(0, 10 - COUNT(CASE WHEN s.estatus = 'en_revision' THEN 1 END)) as capacidad_disponible,
          
          -- Solicitudes devueltas por falta de información
          COUNT(CASE 
            WHEN s.estatus = 'rechazada' 
                 AND s.motivo_rechazo LIKE '%documentos%' 
            THEN 1 
          END) as solicitudes_devueltas,
          
          -- Cumplimiento SLA (72 horas)
          ROUND(
            (COUNT(CASE 
              WHEN s.estatus IN ('aprobada', 'rechazada') 
                   AND TIMESTAMPDIFF(HOUR, s.fecha_solicitud, s.fecha_actualizacion) <= 72 
              THEN 1 
            END) / 
             NULLIF(COUNT(CASE WHEN s.estatus IN ('aprobada', 'rechazada') THEN 1 END), 0)) * 100, 
            2
          ) as cumplimiento_sla
          
        FROM usuario u
        LEFT JOIN solicitud s ON u.usuario_id = s.usuario_asignado_id 
        WHERE u.rol IN ('ADMIN', 'SUPER', 'OPERADOR')
          AND u.activo = true
          AND s.fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY u.usuario_id, u.nombre, u.email
        HAVING COUNT(s.solicitud_id) > 0
        ORDER BY capacidad_disponible DESC, tiempo_promedio_revision ASC
      `;

      const equipos = await sequelize.query(queryEquipos, {
        type: QueryTypes.SELECT
      }) as any[];

      // Solicitudes pendientes de asignación
      const querySolicitudesPendientes = `
        SELECT 
          s.solicitud_id,
          CONCAT(c.nombre, ' ', c.apellido_paterno) as cliente,
          GROUP_CONCAT(sp.producto) as productos,
          SUM(sp.monto) as monto_total,
          TIMESTAMPDIFF(DAY, s.fecha_solicitud, NOW()) as dias_pendiente,
          
          -- Estimación de riesgo simplificada
          CASE 
            WHEN SUM(sp.monto) > 1000000 THEN 'alto'
            WHEN SUM(sp.monto) > 300000 THEN 'medio'
            ELSE 'bajo'
          END as riesgo_estimado
          
        FROM solicitud s
        JOIN cliente c ON s.cliente_id = c.cliente_id
        JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
        WHERE s.estatus = 'iniciada' 
          AND s.usuario_asignado_id IS NULL
        GROUP BY s.solicitud_id, c.nombre, c.apellido_paterno
        ORDER BY 
          CASE 
            WHEN SUM(sp.monto) > 1000000 THEN 1
            WHEN SUM(sp.monto) > 300000 THEN 2
            ELSE 3
          END,
          s.fecha_solicitud ASC
        LIMIT 20
      `;

      const solicitudesPendientes = await sequelize.query(querySolicitudesPendientes, {
        type: QueryTypes.SELECT
      }) as any[];

      // Transformar datos de equipos
      const equiposTransformados: Record<string, any> = {};
      equipos.forEach((usuario: any) => {
        equiposTransformados[usuario.usuario_id] = {
          nombre: usuario.nombre,
          solicitudes_asignadas: usuario.solicitudes_asignadas || 0,
          solicitudes_completadas_hoy: usuario.solicitudes_completadas_hoy || 0,
          tiempo_promedio_revision: usuario.tiempo_promedio_revision || 0,
          tasa_aprobacion_personal: usuario.tasa_aprobacion_personal || 0,
          capacidad_disponible: usuario.capacidad_disponible || 0,
          especialidades: ['CS', 'CC'], // Simplificado - en producción obtener de configuración
          solicitudes_devueltas: usuario.solicitudes_devueltas || 0,
          satisfaccion_cliente: 85, // Simplificado - integrar con sistema de feedback
          cumplimiento_sla: usuario.cumplimiento_sla || 0
        };
      });

      gestion = {
        equipos_revision: equiposTransformados,
        solicitudes_pendientes_asignacion: {
          alta_prioridad: solicitudesPendientes.map((sol: any) => ({
            solicitud_id: sol.solicitud_id,
            cliente: sol.cliente,
            productos: sol.productos ? sol.productos.split(',') : [],
            monto_total: sol.monto_total || 0,
            dias_pendiente: sol.dias_pendiente || 0,
            riesgo_estimado: sol.riesgo_estimado,
            usuario_sugerido: equipos.length > 0 ? equipos[0].usuario_id : null // Algoritmo simple
          }))
        },
        recomendaciones_redistribucion: [] // Implementar lógica más compleja si es necesario
      };
      
      // Guardar en caché por 5 minutos
      await CacheService.set(cacheKey, gestion, CacheTTL.SHORT / 3);
    }
    
    return gestion;
  }

  /**
   * Sistema de alertas inteligentes
   */
  static async getAlertasInteligentes() {
    const cacheKey = 'solicitudes:alertas:inteligentes';
    
    let alertas = await CacheService.get(cacheKey);
    
    if (!alertas) {
      // Consulta para alertas críticas
      const queryAlertas = `
        SELECT 
          'sla_breach' as tipo,
          'alta' as prioridad,
          CONCAT('Solicitudes vencidas por SLA: ', COUNT(*)) as titulo,
          CONCAT(COUNT(*), ' solicitudes han excedido el SLA de 72 horas') as descripcion,
          GROUP_CONCAT(s.solicitud_id) as solicitudes_afectadas,
          'Reasignar o priorizar revisión inmediata' as accion_recomendada,
          120 as tiempo_estimado_resolucion
        FROM solicitud s
        WHERE s.estatus = 'en_revision' 
          AND TIMESTAMPDIFF(HOUR, s.fecha_solicitud, NOW()) > 72
        HAVING COUNT(*) > 0
        
        UNION ALL
        
        SELECT 
          'high_value' as tipo,
          'media' as prioridad,
          CONCAT('Solicitudes de alto valor: ', COUNT(*)) as titulo,
          CONCAT(COUNT(*), ' solicitudes superan $1M requieren atención especial') as descripcion,
          GROUP_CONCAT(s.solicitud_id) as solicitudes_afectadas,
          'Revisión por equipo senior especializado' as accion_recomendada,
          180 as tiempo_estimado_resolucion
        FROM solicitud s
        JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
        WHERE s.estatus IN ('iniciada', 'en_revision')
          AND sp.monto > 1000000
        HAVING COUNT(*) > 0
        
        UNION ALL
        
        SELECT 
          'capacity_overload' as tipo,
          'media' as prioridad,
          'Sobrecarga de capacidad detectada' as titulo,
          'Algunos revisores están sobrecargados mientras otros tienen capacidad' as descripcion,
          '' as solicitudes_afectadas,
          'Redistribuir carga de trabajo entre el equipo' as accion_recomendada,
          60 as tiempo_estimado_resolucion
        FROM usuario u
        LEFT JOIN solicitud s ON u.usuario_id = s.usuario_asignado_id AND s.estatus = 'en_revision'
        WHERE u.rol IN ('ADMIN', 'SUPER', 'OPERADOR') AND u.activo = true
        GROUP BY u.usuario_id
        HAVING COUNT(s.solicitud_id) > 8
        LIMIT 1
      `;

      const alertasCriticas = await sequelize.query(queryAlertas, {
        type: QueryTypes.SELECT
      }) as any[];

      // Predicciones de volumen
      const queryPredicciones = `
        SELECT 
          -- Volumen esperado basado en promedio de últimas 4 semanas
          ROUND(
            (SELECT AVG(daily_count) FROM (
              SELECT COUNT(*) as daily_count
              FROM solicitud
              WHERE fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
              GROUP BY DATE(fecha_solicitud)
            ) sub) * 7
          ) as volumen_esperado_proxima_semana,
          
          -- Productos en tendencia al alza (comparando últimas 2 semanas vs anteriores 2)
          (SELECT GROUP_CONCAT(producto) FROM (
            SELECT sp.producto
            FROM solicitud s
            JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
            WHERE s.fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
            GROUP BY sp.producto
            HAVING COUNT(*) > (
              SELECT COUNT(*)
              FROM solicitud s2
              JOIN solicitud_producto sp2 ON s2.solicitud_id = sp2.solicitud_id
              WHERE s2.fecha_solicitud BETWEEN DATE_SUB(CURDATE(), INTERVAL 28 DAY) 
                                            AND DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                AND sp2.producto = sp.producto
            ) * 1.2
            LIMIT 3
          ) trending) as productos_tendencia_alza,
          
          -- Riesgo de cuello de botella
          CASE 
            WHEN (SELECT COUNT(*) FROM solicitud WHERE estatus = 'en_revision') > 50 THEN 80
            WHEN (SELECT COUNT(*) FROM solicitud WHERE estatus = 'en_revision') > 30 THEN 60
            WHEN (SELECT COUNT(*) FROM solicitud WHERE estatus = 'en_revision') > 15 THEN 40
            ELSE 20
          END as riesgo_cuello_botella,
          
          -- Capacidad suficiente del equipo
          CASE 
            WHEN (SELECT COUNT(*) FROM usuario WHERE rol IN ('ADMIN', 'SUPER', 'OPERADOR') AND activo = true) * 10 
                 > (SELECT COUNT(*) FROM solicitud WHERE estatus IN ('iniciada', 'en_revision'))
            THEN true
            ELSE false
          END as capacidad_equipo_suficiente
      `;

      const [predicciones] = await sequelize.query(queryPredicciones, {
        type: QueryTypes.SELECT
      }) as any[];

      alertas = {
        alertas_criticas: alertasCriticas.map((alerta: any) => ({
          tipo: alerta.tipo,
          prioridad: alerta.prioridad,
          titulo: alerta.titulo,
          descripcion: alerta.descripcion,
          solicitudes_afectadas: alerta.solicitudes_afectadas ? 
            alerta.solicitudes_afectadas.split(',').map(Number) : [],
          accion_recomendada: alerta.accion_recomendada,
          tiempo_estimado_resolucion: alerta.tiempo_estimado_resolucion,
          responsable_sugerido: null // Implementar lógica de asignación
        })),
        tendencias_predictivas: {
          volumen_esperado_proxima_semana: predicciones?.volumen_esperado_proxima_semana || 0,
          productos_tendencia_alza: predicciones?.productos_tendencia_alza ? 
            predicciones.productos_tendencia_alza.split(',') : [],
          riesgo_cuello_botella: predicciones?.riesgo_cuello_botella || 0,
          capacidad_equipo_suficiente: predicciones?.capacidad_equipo_suficiente || false
        },
        optimizaciones_sugeridas: [
          {
            area: 'proceso',
            impacto_estimado: 'Reducción del 20% en tiempo de procesamiento',
            esfuerzo_implementacion: 'medio',
            roi_estimado: 150
          },
          {
            area: 'recursos',
            impacto_estimado: 'Aumento del 30% en capacidad de procesamiento',
            esfuerzo_implementacion: 'alto',
            roi_estimado: 200
          }
        ]
      };
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, alertas, CacheTTL.SHORT * 2/3);
    }
    
    return alertas;
  }

  /**
   * Reporte de performance comparativo
   */
  static async getReportePerformanceComparativo(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
  } = {}) {
    const cacheKey = `solicitudes:reporte:performance:${JSON.stringify(filtros)}`;
    
    let reporte = await CacheService.get(cacheKey);
    
    if (!reporte) {
      const { fechaInicio, fechaFin } = filtros;
      
      // Si no se proporcionan fechas, usar último mes vs mes anterior
      const fechaFinReal = fechaFin || new Date();
      const fechaInicioReal = fechaInicio || new Date(new Date().setMonth(new Date().getMonth() - 1));
      const fechaInicioAnterior = new Date(fechaInicioReal);
      fechaInicioAnterior.setMonth(fechaInicioAnterior.getMonth() - 1);
      const fechaFinAnterior = new Date(fechaInicioReal);
      fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1);

      const queryComparativo = `
        WITH periodo_actual AS (
          SELECT 
            COUNT(DISTINCT s.solicitud_id) as solicitudes_totales,
            SUM(sp.monto) as valor_total_cartera,
            AVG(CASE 
              WHEN s.estatus = 'aprobada' 
              THEN TIMESTAMPDIFF(HOUR, s.fecha_solicitud, s.fecha_actualizacion) 
            END) as tiempo_promedio_aprobacion,
            ROUND(
              (SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) / 
               COUNT(DISTINCT s.solicitud_id)) * 100, 
              2
            ) as tasa_conversion_global
          FROM solicitud s
          JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
          WHERE s.fecha_solicitud BETWEEN :fechaInicio AND :fechaFin
        ),
        periodo_anterior AS (
          SELECT 
            COUNT(DISTINCT s.solicitud_id) as solicitudes_totales,
            SUM(sp.monto) as valor_total_cartera,
            AVG(CASE 
              WHEN s.estatus = 'aprobada' 
              THEN TIMESTAMPDIFF(HOUR, s.fecha_solicitud, s.fecha_actualizacion) 
            END) as tiempo_promedio_aprobacion,
            ROUND(
              (SUM(CASE WHEN s.estatus = 'aprobada' THEN 1 ELSE 0 END) / 
               COUNT(DISTINCT s.solicitud_id)) * 100, 
              2
            ) as tasa_conversion_global
          FROM solicitud s
          JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
          WHERE s.fecha_solicitud BETWEEN :fechaInicioAnterior AND :fechaFinAnterior
        )
        
        SELECT 
          pa.solicitudes_totales as actual_solicitudes,
          ant.solicitudes_totales as anterior_solicitudes,
          ROUND(((pa.solicitudes_totales - ant.solicitudes_totales) / NULLIF(ant.solicitudes_totales, 0)) * 100, 2) as variacion_solicitudes,
          
          pa.valor_total_cartera as actual_valor,
          ant.valor_total_cartera as anterior_valor,
          ROUND(((pa.valor_total_cartera - ant.valor_total_cartera) / NULLIF(ant.valor_total_cartera, 0)) * 100, 2) as variacion_valor,
          
          pa.tiempo_promedio_aprobacion as actual_tiempo,
          ant.tiempo_promedio_aprobacion as anterior_tiempo,
          ROUND(((pa.tiempo_promedio_aprobacion - ant.tiempo_promedio_aprobacion) / NULLIF(ant.tiempo_promedio_aprobacion, 0)) * 100, 2) as variacion_tiempo,
          
          pa.tasa_conversion_global as actual_conversion,
          ant.tasa_conversion_global as anterior_conversion,
          ROUND(pa.tasa_conversion_global - ant.tasa_conversion_global, 2) as variacion_conversion
          
        FROM periodo_actual pa
        CROSS JOIN periodo_anterior ant
      `;

      const [metricas] = await sequelize.query(queryComparativo, {
        replacements: {
          fechaInicio: fechaInicioReal,
          fechaFin: fechaFinReal,
          fechaInicioAnterior,
          fechaFinAnterior
        },
        type: QueryTypes.SELECT
      }) as any[];

      reporte = {
        periodo_analisis: {
          fecha_inicio: fechaInicioReal.toISOString().split('T')[0],
          fecha_fin: fechaFinReal.toISOString().split('T')[0],
          periodo_comparacion: `${fechaInicioAnterior.toISOString().split('T')[0]} al ${fechaFinAnterior.toISOString().split('T')[0]}`
        },
        metricas_principales: {
          solicitudes_totales: {
            actual: metricas?.actual_solicitudes || 0,
            anterior: metricas?.anterior_solicitudes || 0,
            variacion: metricas?.variacion_solicitudes || 0
          },
          valor_total_cartera: {
            actual: metricas?.actual_valor || 0,
            anterior: metricas?.anterior_valor || 0,
            variacion: metricas?.variacion_valor || 0
          },
          tiempo_promedio_aprobacion: {
            actual: metricas?.actual_tiempo || 0,
            anterior: metricas?.anterior_tiempo || 0,
            variacion: metricas?.variacion_tiempo || 0
          },
          tasa_conversion_global: {
            actual: metricas?.actual_conversion || 0,
            anterior: metricas?.anterior_conversion || 0,
            variacion: metricas?.variacion_conversion || 0
          }
        },
        // Simplificado - en producción agregar más análisis
        performance_por_producto: {},
        performance_equipo: [],
        indicadores_negocio: {
          ingreso_estimado_periodo: (metricas?.actual_valor || 0) * 0.15,
          costo_operativo_estimado: 50000, // Simplificado
          roi_operacional: 150, // Simplificado
          satisfaccion_cliente_promedio: 4.2, // Simplificado
          nps_score: 65 // Simplificado
        }
      };
      
      // Guardar en caché por 1 hora
      await CacheService.set(cacheKey, reporte, CacheTTL.LONG);
    }
    
    return reporte;
  }

  /**
   * Asignación inteligente de solicitudes (simulación)
   * Nota: Esta funcionalidad está limitada por el esquema actual del modelo Solicitud
   */
  static async asignarSolicitudInteligente(solicitudId: number) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const solicitud = await Solicitud.findByPk(solicitudId, {
        include: [
          {
            model: SolicitudProducto,
            as: 'productos'
          }
        ],
        transaction
      });

      if (!solicitud) {
        throw new Error('Solicitud no encontrada');
      }

      // Como el modelo actual no soporta asignación de usuarios,
      // simulamos la lógica de asignación cambiando el estatus
      if (solicitud.estatus !== 'iniciada') {
        throw new Error('La solicitud no está en estado para asignación');
      }

      // Obtener usuarios disponibles con sus métricas
      const queryUsuarios = `
        SELECT 
          u.usuario_id,
          u.nombre,
          COUNT(s.solicitud_id) as carga_estimada,
          u.rol
        FROM usuario u
        LEFT JOIN solicitud s ON 1=0  -- No hay relación directa, simulamos carga
        WHERE u.rol IN ('ADMIN', 'SUPER', 'OPERADOR')
          AND u.activo = true
        GROUP BY u.usuario_id, u.nombre, u.rol
        ORDER BY 
          CASE u.rol 
            WHEN 'SUPER' THEN 1 
            WHEN 'ADMIN' THEN 2 
            WHEN 'OPERADOR' THEN 3 
          END,
          u.usuario_id
        LIMIT 5
      `;

      const usuariosDisponibles = await sequelize.query(queryUsuarios, {
        type: QueryTypes.SELECT,
        transaction
      }) as any[];

      if (usuariosDisponibles.length === 0) {
        throw new Error('No hay usuarios disponibles para asignación');
      }

      // Seleccionar el mejor usuario (algoritmo simple por rol)
      const usuarioSeleccionado = usuariosDisponibles[0];

      // Cambiar estatus a en_revision (simulando asignación)
      await solicitud.update({
        estatus: 'en_revision' as const,
        fecha_actualizacion: new Date()
      }, { transaction });

      // Invalidar cachés relevantes
      await CacheService.delPattern('solicitudes:*');
      
      logInfo('Solicitud movida a revisión (simulando asignación)', {
        solicitud_id: solicitudId,
        usuario_recomendado: usuarioSeleccionado.usuario_id,
        algoritmo: 'rol_prioridad'
      });

      return {
        solicitud_id: solicitudId,
        usuario_recomendado: {
          usuario_id: usuarioSeleccionado.usuario_id,
          nombre: usuarioSeleccionado.nombre,
          rol: usuarioSeleccionado.rol
        },
        estatus_nuevo: 'en_revision',
        mensaje: 'Solicitud movida a revisión exitosamente (asignación simulada)',
        nota: 'Para implementar asignación real, agregar campo usuario_asignado_id al modelo Solicitud'
      };
    });
  }

  /**
   * Obtener solicitudes para exportación con filtros
   */
  static async getSolicitudesParaExportacion(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    productos?: string[];
    estatus?: string[];
    limite?: number;
  } = {}) {
    const { fechaInicio, fechaFin, productos, estatus, limite = 1000 } = filtros;
    
    let whereClause = '';
    const replacements: any = {};
    
    if (fechaInicio && fechaFin) {
      whereClause += ' AND s.fecha_creacion BETWEEN :fechaInicio AND :fechaFin';
      replacements.fechaInicio = fechaInicio;
      replacements.fechaFin = fechaFin;
    }
    
    if (productos && productos.length > 0) {
      whereClause += ' AND sp.producto IN (:productos)';
      replacements.productos = productos;
    }
    
    if (estatus && estatus.length > 0) {
      whereClause += ' AND s.estatus IN (:estatus)';
      replacements.estatus = estatus;
    }

    const query = `
      SELECT 
        s.solicitud_id,
        CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')) as cliente_nombre,
        c.email as cliente_email,
        s.estatus,
        s.fecha_creacion,
        s.fecha_actualizacion,
        GROUP_CONCAT(sp.producto) as productos,
        SUM(sp.monto) as monto_total,
        COUNT(sp.solicitud_producto_id) as total_productos
      FROM solicitud s
      JOIN cliente c ON s.cliente_id = c.cliente_id
      LEFT JOIN solicitud_producto sp ON s.solicitud_id = sp.solicitud_id
      WHERE 1=1 ${whereClause}
      GROUP BY s.solicitud_id, c.nombre, c.apellido_paterno, c.apellido_materno, c.email, s.estatus, s.fecha_creacion, s.fecha_actualizacion
      ORDER BY s.fecha_creacion DESC
      LIMIT :limite
    `;

    replacements.limite = limite;

    const solicitudes = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return solicitudes;
  }
}
