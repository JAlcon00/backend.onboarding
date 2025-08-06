import { Documento } from './documento.model';
import { DocumentoTipo } from './documentoTipo.model';
import { Op, Transaction, QueryTypes } from 'sequelize';
import { TransactionService } from '../../services/transaction.service';
import { CacheService, CacheKeys, CacheTTL } from '../../config/cache';
import { sequelize } from '../../config/database';

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

  // ==================== ESTADÍSTICAS ADMINISTRATIVAS ====================

  /**
   * Obtener estadísticas generales de documentos para dashboard administrativo
   */
  static async getEstadisticasGenerales(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    tipoPersona?: 'PF' | 'PF_AE' | 'PM';
  } = {}) {
    const cacheKey = `documentos:estadisticas:${JSON.stringify(filtros)}`;
    
    let estadisticas = await CacheService.get(cacheKey);
    
    if (!estadisticas) {
      const { fechaInicio, fechaFin, tipoPersona } = filtros;
      
      // Construir condiciones WHERE
      let whereClause = '';
      const replacements: any = {};
      
      if (fechaInicio && fechaFin) {
        whereClause += ' AND d.fecha_subida BETWEEN :fechaInicio AND :fechaFin';
        replacements.fechaInicio = fechaInicio;
        replacements.fechaFin = fechaFin;
      }
      
      if (tipoPersona) {
        whereClause += ' AND c.tipo_persona = :tipoPersona';
        replacements.tipoPersona = tipoPersona;
      }

      const query = `
        SELECT 
          -- Totales generales
          COUNT(*) as total_documentos,
          COUNT(DISTINCT d.cliente_id) as clientes_con_documentos,
          
          -- Por estatus
          SUM(CASE WHEN d.estatus = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN d.estatus = 'aceptado' THEN 1 ELSE 0 END) as aceptados,
          SUM(CASE WHEN d.estatus = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
          SUM(CASE WHEN d.estatus = 'vencido' THEN 1 ELSE 0 END) as vencidos,
          
          -- Métricas de tiempo
          AVG(CASE 
            WHEN d.estatus IN ('aceptado', 'rechazado') 
            THEN TIMESTAMPDIFF(HOUR, d.fecha_subida, d.updated_at) 
            ELSE NULL 
          END) as horas_promedio_revision,
          
          -- Próximos a vencer
          SUM(CASE 
            WHEN d.fecha_expiracion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                 AND d.estatus = 'aceptado'
            THEN 1 ELSE 0 
          END) as proximos_vencer_30_dias,
          
          -- Tendencias
          SUM(CASE WHEN DATE(d.fecha_subida) = CURDATE() THEN 1 ELSE 0 END) as subidos_hoy,
          SUM(CASE WHEN DATE(d.fecha_subida) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as subidos_semana,
          
          -- Calidad
          ROUND(
            (SUM(CASE WHEN d.estatus = 'aceptado' THEN 1 ELSE 0 END) / 
             NULLIF(SUM(CASE WHEN d.estatus IN ('aceptado', 'rechazado') THEN 1 ELSE 0 END), 0)) * 100, 
            2
          ) as porcentaje_aprobacion
          
        FROM documento d
        LEFT JOIN cliente c ON d.cliente_id = c.cliente_id
        WHERE 1=1 ${whereClause}
      `;

      const [result] = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      }) as any[];

      estadisticas = {
        ...result,
        // Métricas adicionales
        eficiencia_revision: (result as any).horas_promedio_revision < 24 ? 'alta' : 
                            (result as any).horas_promedio_revision < 72 ? 'media' : 'baja',
        alerta_vencimientos: (result as any).proximos_vencer_30_dias > 10,
        tendencia_subidas: (result as any).subidos_semana > (result as any).subidos_hoy * 7 ? 'creciente' : 'estable'
      };
      
      // Guardar en caché por 15 minutos
      await CacheService.set(cacheKey, estadisticas, CacheTTL.SHORT / 2);
    }
    
    return estadisticas;
  }

  /**
   * Obtener estadísticas por tipo de documento
   */
  static async getEstadisticasPorTipo(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    tipoPersona?: 'PF' | 'PF_AE' | 'PM';
  } = {}) {
    const cacheKey = `documentos:estadisticas:tipos:${JSON.stringify(filtros)}`;
    
    let estadisticas = await CacheService.get(cacheKey);
    
    if (!estadisticas) {
      const { fechaInicio, fechaFin, tipoPersona } = filtros;
      
      let whereClause = '';
      const replacements: any = {};
      
      if (fechaInicio && fechaFin) {
        whereClause += ' AND d.fecha_subida BETWEEN :fechaInicio AND :fechaFin';
        replacements.fechaInicio = fechaInicio;
        replacements.fechaFin = fechaFin;
      }
      
      if (tipoPersona) {
        whereClause += ` AND (
          (dt.aplica_pf = true AND :tipoPersona = 'PF') OR
          (dt.aplica_pfae = true AND :tipoPersona = 'PF_AE') OR  
          (dt.aplica_pm = true AND :tipoPersona = 'PM')
        )`;
        replacements.tipoPersona = tipoPersona;
      }

      const query = `
        SELECT 
          dt.documento_tipo_id,
          dt.nombre as tipo_nombre,
          dt.opcional,
          dt.vigencia_dias,
          
          -- Conteos
          COUNT(d.documento_id) as total_subidos,
          COUNT(DISTINCT d.cliente_id) as clientes_diferentes,
          
          -- Por estatus
          SUM(CASE WHEN d.estatus = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN d.estatus = 'aceptado' THEN 1 ELSE 0 END) as aceptados,
          SUM(CASE WHEN d.estatus = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
          SUM(CASE WHEN d.estatus = 'vencido' THEN 1 ELSE 0 END) as vencidos,
          
          -- Métricas de calidad
          ROUND(
            (SUM(CASE WHEN d.estatus = 'aceptado' THEN 1 ELSE 0 END) / 
             NULLIF(SUM(CASE WHEN d.estatus IN ('aceptado', 'rechazado') THEN 1 ELSE 0 END), 0)) * 100, 
            2
          ) as porcentaje_aprobacion,
          
          -- Tiempo promedio de revisión
          AVG(CASE 
            WHEN d.estatus IN ('aceptado', 'rechazado') 
            THEN TIMESTAMPDIFF(HOUR, d.fecha_subida, d.updated_at) 
            ELSE NULL 
          END) as horas_promedio_revision,
          
          -- Documentos próximos a vencer
          SUM(CASE 
            WHEN d.fecha_expiracion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                 AND d.estatus = 'aceptado'
            THEN 1 ELSE 0 
          END) as proximos_vencer
          
        FROM documento_tipo dt
        LEFT JOIN documento d ON dt.documento_tipo_id = d.documento_tipo_id ${whereClause.replace('AND', 'AND')}
        GROUP BY dt.documento_tipo_id, dt.nombre, dt.opcional, dt.vigencia_dias
        ORDER BY COUNT(d.documento_id) DESC
      `;

      const result = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      });

      estadisticas = result.map((tipo: any) => ({
        ...tipo,
        // Clasificaciones adicionales
        prioridad: tipo.opcional ? 'baja' : 'alta',
        problematico: tipo.porcentaje_aprobacion < 80,
        revision_lenta: tipo.horas_promedio_revision > 48,
        requiere_atencion: tipo.proximos_vencer > 5
      }));
      
      // Guardar en caché por 30 minutos
      await CacheService.set(cacheKey, estadisticas, CacheTTL.SHORT);
    }
    
    return estadisticas;
  }

  /**
   * Análisis de completitud consolidado para administradores
   */
  static async getAnalisisCompletitudConsolidado(filtros: {
    tipoPersona?: 'PF' | 'PF_AE' | 'PM';
    umbralCompletitud?: number;
  } = {}) {
    const { tipoPersona, umbralCompletitud = 80 } = filtros;
    const cacheKey = `documentos:completitud:consolidado:${JSON.stringify(filtros)}`;
    
    let analisis = await CacheService.get(cacheKey);
    
    if (!analisis) {
      let whereClause = '';
      const replacements: any = { umbralCompletitud };
      
      if (tipoPersona) {
        whereClause = 'WHERE c.tipo_persona = :tipoPersona';
        replacements.tipoPersona = tipoPersona;
      }

      const query = `
        WITH completitud_por_cliente AS (
          SELECT 
            c.cliente_id,
            c.tipo_persona,
            c.rfc,
            c.correo,
            
            -- Documentos requeridos según tipo de persona
            (SELECT COUNT(*) 
             FROM documento_tipo dt 
             WHERE dt.opcional = false 
               AND ((c.tipo_persona = 'PF' AND dt.aplica_pf = true) OR
                    (c.tipo_persona = 'PF_AE' AND dt.aplica_pfae = true) OR
                    (c.tipo_persona = 'PM' AND dt.aplica_pm = true))
            ) as documentos_requeridos,
            
            -- Documentos subidos y aprobados
            COUNT(CASE WHEN d.documento_id IS NOT NULL THEN 1 END) as documentos_subidos,
            COUNT(CASE WHEN d.estatus = 'aceptado' THEN 1 END) as documentos_aprobados,
            
            -- Cálculo de completitud
            ROUND(
              (COUNT(CASE WHEN d.estatus = 'aceptado' THEN 1 END) / 
               NULLIF((SELECT COUNT(*) 
                       FROM documento_tipo dt 
                       WHERE dt.opcional = false 
                         AND ((c.tipo_persona = 'PF' AND dt.aplica_pf = true) OR
                              (c.tipo_persona = 'PF_AE' AND dt.aplica_pfae = true) OR
                              (c.tipo_persona = 'PM' AND dt.aplica_pm = true))), 0)) * 100, 
              2
            ) as porcentaje_completitud
            
          FROM cliente c
          LEFT JOIN documento d ON c.cliente_id = d.cliente_id
          ${whereClause}
          GROUP BY c.cliente_id, c.tipo_persona, c.rfc, c.correo
        )
        
        SELECT 
          -- Totales generales
          COUNT(*) as total_clientes,
          AVG(porcentaje_completitud) as completitud_promedio,
          
          -- Por rangos de completitud
          SUM(CASE WHEN porcentaje_completitud >= 90 THEN 1 ELSE 0 END) as clientes_90_100,
          SUM(CASE WHEN porcentaje_completitud >= 70 AND porcentaje_completitud < 90 THEN 1 ELSE 0 END) as clientes_70_89,
          SUM(CASE WHEN porcentaje_completitud >= 50 AND porcentaje_completitud < 70 THEN 1 ELSE 0 END) as clientes_50_69,
          SUM(CASE WHEN porcentaje_completitud < 50 THEN 1 ELSE 0 END) as clientes_0_49,
          
          -- Clientes problemáticos
          SUM(CASE WHEN porcentaje_completitud < :umbralCompletitud THEN 1 ELSE 0 END) as clientes_bajo_umbral,
          SUM(CASE WHEN documentos_subidos = 0 THEN 1 ELSE 0 END) as clientes_sin_documentos,
          
          -- Por tipo de persona
          SUM(CASE WHEN tipo_persona = 'PF' THEN 1 ELSE 0 END) as total_pf,
          SUM(CASE WHEN tipo_persona = 'PF_AE' THEN 1 ELSE 0 END) as total_pfae,
          SUM(CASE WHEN tipo_persona = 'PM' THEN 1 ELSE 0 END) as total_pm
          
        FROM completitud_por_cliente
      `;

      const [result] = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      }) as any[];

      // Obtener lista de clientes con baja completitud para seguimiento
      const clientesBajaCompletitud = await sequelize.query(`
        WITH completitud_por_cliente AS (
          SELECT 
            c.cliente_id,
            c.tipo_persona,
            c.rfc,
            c.correo,
            
            -- Documentos requeridos según tipo de persona
            (SELECT COUNT(*) 
             FROM documento_tipo dt 
             WHERE dt.opcional = false 
               AND ((c.tipo_persona = 'PF' AND dt.aplica_pf = true) OR
                    (c.tipo_persona = 'PF_AE' AND dt.aplica_pfae = true) OR
                    (c.tipo_persona = 'PM' AND dt.aplica_pm = true))
            ) as documentos_requeridos,
            
            -- Documentos subidos y aprobados
            COUNT(CASE WHEN d.documento_id IS NOT NULL THEN 1 END) as documentos_subidos,
            COUNT(CASE WHEN d.estatus = 'aceptado' THEN 1 END) as documentos_aprobados,
            
            -- Cálculo de completitud
            ROUND(
              (COUNT(CASE WHEN d.estatus = 'aceptado' THEN 1 END) / 
               NULLIF((SELECT COUNT(*) 
                       FROM documento_tipo dt 
                       WHERE dt.opcional = false 
                         AND ((c.tipo_persona = 'PF' AND dt.aplica_pf = true) OR
                              (c.tipo_persona = 'PF_AE' AND dt.aplica_pfae = true) OR
                              (c.tipo_persona = 'PM' AND dt.aplica_pm = true))), 0)) * 100, 
              2
            ) as porcentaje_completitud,
            
            (documentos_requeridos - COUNT(CASE WHEN d.estatus = 'aceptado' THEN 1 END)) as documentos_faltantes
            
          FROM cliente c
          LEFT JOIN documento d ON c.cliente_id = d.cliente_id
          ${whereClause}
          GROUP BY c.cliente_id, c.tipo_persona, c.rfc, c.correo
        )
        SELECT cliente_id, rfc, correo, porcentaje_completitud, documentos_faltantes
        FROM completitud_por_cliente
        WHERE porcentaje_completitud < :umbralCompletitud
        ORDER BY porcentaje_completitud ASC
        LIMIT 20
      `, {
        replacements,
        type: QueryTypes.SELECT
      });

      analisis = {
        ...result,
        clientes_criticos: clientesBajaCompletitud,
        recomendaciones: {
          seguimiento_requerido: (result as any).clientes_bajo_umbral > 0,
          campana_documentos: (result as any).clientes_sin_documentos > 10,
          revision_procesos: (result as any).completitud_promedio < 75
        }
      };
      
      // Guardar en caché por 1 hora
      await CacheService.set(cacheKey, analisis, CacheTTL.LONG);
    }
    
    return analisis;
  }

  /**
   * Obtener métricas de performance del equipo de revisión
   */
  static async getMetricasEquipoRevision(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
  } = {}) {
    const cacheKey = `documentos:metricas:equipo:${JSON.stringify(filtros)}`;
    
    let metricas = await CacheService.get(cacheKey);
    
    if (!metricas) {
      const { fechaInicio, fechaFin } = filtros;
      
      let whereClause = '';
      const replacements: any = {};
      
      if (fechaInicio && fechaFin) {
        whereClause = `AND d.updated_at BETWEEN :fechaInicio AND :fechaFin`;
        replacements.fechaInicio = fechaInicio;
        replacements.fechaFin = fechaFin;
      } else {
        whereClause = `AND d.updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
      }

      const query = `
        SELECT 
          u.usuario_id,
          u.nombre as revisor_nombre,
          u.email as revisor_email,
          
          -- Productividad
          COUNT(d.documento_id) as documentos_revisados,
          SUM(CASE WHEN d.estatus = 'aceptado' THEN 1 ELSE 0 END) as documentos_aprobados,
          SUM(CASE WHEN d.estatus = 'rechazado' THEN 1 ELSE 0 END) as documentos_rechazados,
          
          -- Calidad (tasa de aprobación)
          ROUND(
            (SUM(CASE WHEN d.estatus = 'aceptado' THEN 1 ELSE 0 END) / COUNT(d.documento_id)) * 100, 
            2
          ) as tasa_aprobacion,
          
          -- Velocidad
          AVG(TIMESTAMPDIFF(HOUR, d.fecha_subida, d.updated_at)) as horas_promedio_revision,
          MIN(TIMESTAMPDIFF(HOUR, d.fecha_subida, d.updated_at)) as revision_mas_rapida,
          MAX(TIMESTAMPDIFF(HOUR, d.fecha_subida, d.updated_at)) as revision_mas_lenta,
          
          -- Distribución de trabajo
          COUNT(DISTINCT d.cliente_id) as clientes_atendidos,
          COUNT(DISTINCT d.documento_tipo_id) as tipos_documento_manejados
          
        FROM documento d
        LEFT JOIN usuario u ON d.revisor_usuario_id = u.usuario_id
        WHERE d.estatus IN ('aceptado', 'rechazado')
          AND d.revisor_usuario_id IS NOT NULL
          ${whereClause}
        GROUP BY u.usuario_id, u.nombre, u.email
        ORDER BY documentos_revisados DESC
      `;

      const result = await sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT
      }) as any[];

      metricas = {
        revisores: result.map((revisor: any) => ({
          ...revisor,
          // Clasificaciones
          performance: revisor.horas_promedio_revision < 24 ? 'excelente' :
                      revisor.horas_promedio_revision < 48 ? 'buena' :
                      revisor.horas_promedio_revision < 72 ? 'regular' : 'necesita_mejora',
          calidad: revisor.tasa_aprobacion > 90 ? 'alta' :
                  revisor.tasa_aprobacion > 80 ? 'media' : 'baja',
          carga_trabajo: revisor.documentos_revisados > 100 ? 'alta' :
                        revisor.documentos_revisados > 50 ? 'media' : 'baja'
        })),
        // Métricas consolidadas del equipo
        equipo_consolidado: {
          total_revisores_activos: result.length,
          promedio_documentos_por_revisor: result.length > 0 ? result.reduce((sum, r) => sum + (r as any).documentos_revisados, 0) / result.length : 0,
          tasa_aprobacion_equipo: result.length > 0 ? result.reduce((sum, r) => sum + (r as any).tasa_aprobacion, 0) / result.length : 0,
          tiempo_promedio_equipo: result.length > 0 ? result.reduce((sum, r) => sum + (r as any).horas_promedio_revision, 0) / result.length : 0
        }
      };
      
      // Guardar en caché por 30 minutos
      await CacheService.set(cacheKey, metricas, CacheTTL.SHORT);
    }
    
    return metricas;
  }

  // ==================== GESTIÓN DE TIPOS DE DOCUMENTO ====================

  /**
   * Crear nuevo tipo de documento (solo ADMIN+)
   */
  static async createTipoDocumento(data: {
    nombre: string;
    descripcion?: string;
    aplica_pf: boolean;
    aplica_pfae: boolean;
    aplica_pm: boolean;
    vigencia_dias?: number;
    opcional: boolean;
    formatos_permitidos?: string[];
    tamano_maximo_mb?: number;
  }) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Validar que no existe un tipo con el mismo nombre
      const existingType = await DocumentoTipo.findOne({
        where: { nombre: data.nombre },
        transaction
      });
      
      if (existingType) {
        throw new Error(`Ya existe un tipo de documento con el nombre: ${data.nombre}`);
      }
      
      // Crear el tipo de documento
      const tipoDocumento = await DocumentoTipo.create(data, { transaction });
      
      // Invalidar caché de tipos
      await CacheService.del(CacheKeys.DOCUMENTO_TIPOS);
      await CacheService.delPattern('documentos:tipos:*');
      
      return tipoDocumento;
    });
  }

  /**
   * Actualizar tipo de documento existente
   */
  static async updateTipoDocumento(tipoId: number, data: Partial<{
    nombre: string;
    descripcion: string;
    aplica_pf: boolean;
    aplica_pfae: boolean;
    aplica_pm: boolean;
    vigencia_dias: number;
    opcional: boolean;
    formatos_permitidos: string[];
    tamano_maximo_mb: number;
  }>) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const tipoDocumento = await DocumentoTipo.findByPk(tipoId, { transaction });
      
      if (!tipoDocumento) {
        throw new Error('Tipo de documento no encontrado');
      }
      
      // Si se está cambiando el nombre, validar unicidad
      if (data.nombre && data.nombre !== tipoDocumento.nombre) {
        const existingType = await DocumentoTipo.findOne({
          where: { 
            nombre: data.nombre,
            documento_tipo_id: { [Op.ne]: tipoId }
          },
          transaction
        });
        
        if (existingType) {
          throw new Error(`Ya existe un tipo de documento con el nombre: ${data.nombre}`);
        }
      }
      
      // Actualizar el tipo
      await tipoDocumento.update(data, { transaction });
      
      // Invalidar cachés relacionados
      await CacheService.del(CacheKeys.DOCUMENTO_TIPOS);
      await CacheService.delPattern('documentos:tipos:*');
      await CacheService.delPattern('documentos:completitud:*');
      
      return tipoDocumento;
    });
  }

  /**
   * Eliminar tipo de documento (solo si no tiene documentos asociados)
   */
  static async deleteTipoDocumento(tipoId: number, forzar: boolean = false) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const tipoDocumento = await DocumentoTipo.findByPk(tipoId, { transaction });
      
      if (!tipoDocumento) {
        throw new Error('Tipo de documento no encontrado');
      }
      
      // Verificar si tiene documentos asociados
      const documentosAsociados = await Documento.count({
        where: { documento_tipo_id: tipoId },
        transaction
      });
      
      if (documentosAsociados > 0 && !forzar) {
        throw new Error(`No se puede eliminar el tipo de documento. Tiene ${documentosAsociados} documentos asociados. Use forzar=true para eliminar de todos modos.`);
      }
      
      if (forzar && documentosAsociados > 0) {
        // Eliminar todos los documentos asociados primero
        await Documento.destroy({
          where: { documento_tipo_id: tipoId },
          transaction
        });
      }
      
      // Eliminar el tipo de documento
      await tipoDocumento.destroy({ transaction });
      
      // Invalidar cachés
      await CacheService.del(CacheKeys.DOCUMENTO_TIPOS);
      await CacheService.delPattern('documentos:tipos:*');
      await CacheService.delPattern('documentos:completitud:*');
      
      return { 
        message: 'Tipo de documento eliminado correctamente',
        documentos_eliminados: documentosAsociados 
      };
    });
  }

  // ==================== OPERACIONES MASIVAS ====================

  /**
   * Revisar múltiples documentos en lote
   */
  static async revisarDocumentosLote(
    documentoIds: number[],
    accion: 'aceptar' | 'rechazar',
    comentario?: string,
    revisorId?: number
  ) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const estatus = accion === 'aceptar' ? 'aceptado' : 'rechazado';
      const documentosActualizados = [];
      const errores = [];
      
      for (const documentoId of documentoIds) {
        try {
          const documento = await Documento.findByPk(documentoId, { transaction });
          
          if (!documento) {
            errores.push(`Documento ${documentoId}: No encontrado`);
            continue;
          }
          
          if (documento.estatus !== 'pendiente') {
            errores.push(`Documento ${documentoId}: Ya fue revisado (${documento.estatus})`);
            continue;
          }
          
          await documento.update({
            estatus,
            comentario_revisor: comentario
          }, { transaction });
          
          documentosActualizados.push(documento);
          
        } catch (error: any) {
          errores.push(`Documento ${documentoId}: ${error.message}`);
        }
      }
      
      // Invalidar cachés relevantes
      const clientesAfectados = [...new Set(documentosActualizados.map(d => d.cliente_id))];
      for (const clienteId of clientesAfectados) {
        await CacheService.del(CacheKeys.DOCUMENTOS_CLIENTE(clienteId));
        await CacheService.del(CacheKeys.COMPLETITUD_CLIENTE(clienteId));
      }
      await CacheService.delPattern('documentos:estadisticas:*');
      
      return {
        procesados: documentosActualizados.length,
        errores: errores.length,
        documentos_actualizados: documentosActualizados.map(d => ({
          documento_id: d.documento_id,
          cliente_id: d.cliente_id,
          nuevo_estatus: d.estatus
        })),
        errores_detalle: errores
      };
    });
  }

  /**
   * Exportar datos de documentos para análisis
   */
  static async exportarDatosDocumentos(filtros: {
    fechaInicio?: Date;
    fechaFin?: Date;
    estatus?: string[];
    tipoPersona?: 'PF' | 'PF_AE' | 'PM';
    incluirDatosCliente?: boolean;
  } = {}) {
    const { fechaInicio, fechaFin, estatus, tipoPersona, incluirDatosCliente = false } = filtros;
    
    let whereClause = '';
    const replacements: any = {};
    
    if (fechaInicio && fechaFin) {
      whereClause += ' AND d.fecha_subida BETWEEN :fechaInicio AND :fechaFin';
      replacements.fechaInicio = fechaInicio;
      replacements.fechaFin = fechaFin;
    }
    
    if (estatus && estatus.length > 0) {
      whereClause += ' AND d.estatus IN (:estatus)';
      replacements.estatus = estatus;
    }
    
    if (tipoPersona) {
      whereClause += ' AND c.tipo_persona = :tipoPersona';
      replacements.tipoPersona = tipoPersona;
    }
    
    const camposCliente = incluirDatosCliente ? `
      c.rfc as cliente_rfc,
      c.correo as cliente_email,
      CASE 
        WHEN c.tipo_persona = 'PF' THEN CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', IFNULL(c.apellido_materno, ''))
        WHEN c.tipo_persona = 'PF_AE' THEN CONCAT(c.nombre, ' ', c.apellido_paterno, ' ', IFNULL(c.apellido_materno, ''))
        WHEN c.tipo_persona = 'PM' THEN c.razon_social
      END as cliente_nombre,
      c.tipo_persona,
    ` : '';
    
    const query = `
      SELECT 
        d.documento_id,
        d.cliente_id,
        ${camposCliente}
        dt.nombre as tipo_documento,
        d.estatus,
        d.fecha_documento,
        d.fecha_subida,
        d.fecha_expiracion,
        d.comentario_revisor,
        CASE WHEN d.fecha_expiracion < CURDATE() THEN 'Si' ELSE 'No' END as esta_vencido,
        CASE 
          WHEN d.fecha_expiracion BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
          THEN 'Si' ELSE 'No' 
        END as vence_pronto,
        TIMESTAMPDIFF(DAY, d.fecha_subida, IFNULL(d.updated_at, CURDATE())) as dias_desde_subida,
        CASE 
          WHEN d.estatus IN ('aceptado', 'rechazado') 
          THEN TIMESTAMPDIFF(HOUR, d.fecha_subida, d.updated_at)
          ELSE NULL 
        END as horas_para_revision
        
      FROM documento d
      LEFT JOIN cliente c ON d.cliente_id = c.cliente_id
      LEFT JOIN documento_tipo dt ON d.documento_tipo_id = dt.documento_tipo_id
      WHERE 1=1 ${whereClause}
      ORDER BY d.fecha_subida DESC
    `;
    
    const documentos = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });
    
    return {
      total_registros: documentos.length,
      fecha_exportacion: new Date(),
      filtros_aplicados: filtros,
      documentos
    };
  }
}
