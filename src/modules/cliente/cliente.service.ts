import { Cliente } from './cliente.model';
import { IngresoCliente } from './ingresoCliente.model';
import { CreateClienteInput, UpdateClienteInput } from './cliente.schema';
import { Op, Transaction } from 'sequelize';
import { TransactionService } from '../../services/transaction.service';
import { CacheService, CacheKeys, CacheTTL } from '../../config/cache';
const { sequelize } = require('../../config/database');

export class ClienteService {
  // ==================== CRUD BÁSICO ====================
  
  // Crear cliente con validaciones de negocio y transacciones
  static async createCliente(data: CreateClienteInput) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Validar RFC único
      const existingRfc = await Cliente.findOne({ 
        where: { rfc: data.rfc },
        transaction
      });
      if (existingRfc) {
        throw new Error('Ya existe un cliente con este RFC');
      }

      // Validar correo único
      const existingEmail = await Cliente.findOne({ 
        where: { correo: data.correo },
        transaction
      });
      if (existingEmail) {
        throw new Error('Ya existe un cliente con este correo electrónico');
      }

      // Convertir fechas string a Date
      const clienteData = {
        ...data,
        fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
        fecha_constitucion: data.fecha_constitucion ? new Date(data.fecha_constitucion) : undefined,
      };

      const cliente = await Cliente.create(clienteData, { transaction });
      
      // Invalidar caché relacionado
      await CacheService.delPattern('clientes:*');
      
      return cliente;
    });
  }
  
  // Crear cliente con ingresos en una sola transacción
  static async createClienteConIngresos(
    clienteData: CreateClienteInput, 
    ingresoData?: any
  ) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Validar RFC único
      const existingRfc = await Cliente.findOne({ 
        where: { rfc: clienteData.rfc },
        transaction
      });
      if (existingRfc) {
        throw new Error('Ya existe un cliente con este RFC');
      }

      // Validar correo único
      const existingEmail = await Cliente.findOne({ 
        where: { correo: clienteData.correo },
        transaction
      });
      if (existingEmail) {
        throw new Error('Ya existe un cliente con este correo electrónico');
      }

      // Convertir fechas string a Date
      const processedClienteData = {
        ...clienteData,
        fecha_nacimiento: clienteData.fecha_nacimiento ? new Date(clienteData.fecha_nacimiento) : undefined,
        fecha_constitucion: clienteData.fecha_constitucion ? new Date(clienteData.fecha_constitucion) : undefined,
      };

      // Crear cliente
      const cliente = await Cliente.create(processedClienteData, { transaction });
      
      // Si hay datos de ingresos, crearlos también
      if (ingresoData) {
        await IngresoCliente.create({
          ...ingresoData,
          cliente_id: cliente.cliente_id
        }, { transaction });
      }
      
      // Invalidar caché relacionado
      await CacheService.delPattern('clientes:*');
      
      return cliente;
    });
  }

  // Obtener cliente por ID con caché
  static async getClienteById(id: number) {
    const cacheKey = CacheKeys.CLIENTE(id);
    
    // Intentar obtener del caché
    let cliente = await CacheService.get(cacheKey);
    
    if (!cliente) {
      // Si no está en caché, buscar en BD
      cliente = await Cliente.findByPk(id, {
        include: [
          {
            model: IngresoCliente,
            as: 'ingresos'
          }
        ]
      });
      
      if (cliente) {
        // Guardar en caché por 15 minutos
        await CacheService.set(cacheKey, cliente, CacheTTL.MEDIUM);
      }
    }
    
    return cliente;
  }

  // Actualizar cliente con validaciones y transacciones
  static async updateCliente(id: number, data: UpdateClienteInput) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const cliente = await Cliente.findByPk(id, { transaction });
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Validar RFC único si se está cambiando
      if (data.rfc && data.rfc !== cliente.rfc) {
        const existingRfc = await Cliente.findOne({ 
          where: { 
            rfc: data.rfc,
            cliente_id: { [Op.ne]: id }
          },
          transaction
        });
        if (existingRfc) {
          throw new Error('Ya existe un cliente con este RFC');
        }
      }

      // Validar correo único si se está cambiando
      if (data.correo && data.correo !== cliente.correo) {
        const existingEmail = await Cliente.findOne({ 
          where: { 
            correo: data.correo,
            cliente_id: { [Op.ne]: id }
          },
          transaction
        });
        if (existingEmail) {
          throw new Error('Ya existe un cliente con este correo electrónico');
        }
      }

      // Convertir fechas string a Date si es necesario
      const updateData = {
        ...data,
        fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
        fecha_constitucion: data.fecha_constitucion ? new Date(data.fecha_constitucion) : undefined,
      };

      // Actualizar cliente
      const updatedCliente = await cliente.update(updateData, { transaction });
      
      // Invalidar caché del cliente específico y listas
      await CacheService.del(CacheKeys.CLIENTE(id));
      await CacheService.delPattern('clientes:*');
      await CacheService.del(CacheKeys.COMPLETITUD_CLIENTE(id));
      
      return updatedCliente;
    });
  }

  // Eliminar cliente con transacciones
  static async deleteCliente(id: number) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      const cliente = await Cliente.findByPk(id, { transaction });
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      // Eliminar ingresos asociados
      await IngresoCliente.destroy({
        where: { cliente_id: id },
        transaction
      });

      // Eliminar cliente
      await cliente.destroy({ transaction });
      
      // Invalidar caché
      await CacheService.del(CacheKeys.CLIENTE(id));
      await CacheService.delPattern('clientes:*');
      await CacheService.del(CacheKeys.COMPLETITUD_CLIENTE(id));
      
      return { message: 'Cliente eliminado correctamente' };
    });
  }

  // ==================== BÚSQUEDAS Y FILTROS ====================

  // Buscar cliente por RFC con caché
  static async buscarClientePorRFC(rfc: string) {
    const cacheKey = `cliente:rfc:${rfc}`;
    
    let cliente = await CacheService.get(cacheKey);
    
    if (!cliente) {
      cliente = await Cliente.findOne({
        where: { rfc },
        include: [
          {
            model: IngresoCliente,
            as: 'ingresos'
          }
        ]
      });
      
      if (cliente) {
        await CacheService.set(cacheKey, cliente, CacheTTL.MEDIUM);
      }
    }
    
    return cliente;
  }

  // Buscar cliente por correo con caché
  static async buscarClientePorCorreo(correo: string) {
    const cacheKey = `cliente:correo:${correo}`;
    
    let cliente = await CacheService.get(cacheKey);
    
    if (!cliente) {
      cliente = await Cliente.findOne({
        where: { correo },
        include: [
          {
            model: IngresoCliente,
            as: 'ingresos'
          }
        ]
      });
      
      if (cliente) {
        await CacheService.set(cacheKey, cliente, CacheTTL.MEDIUM);
      }
    }
    
    return cliente;
  }

  // Buscar clientes con filtros avanzados
  static async buscarClientes(filtros: any) {
    const whereCondition: any = {};

    if (filtros.tipo_persona) {
      whereCondition.tipo_persona = filtros.tipo_persona;
    }

    if (filtros.estado) {
      whereCondition.estado = filtros.estado;
    }

    if (filtros.ciudad) {
      whereCondition.ciudad = { [Op.like]: `%${filtros.ciudad}%` };
    }

    if (filtros.codigo_postal) {
      whereCondition.codigo_postal = filtros.codigo_postal;
    }

    if (filtros.search) {
      whereCondition[Op.or] = [
        { nombre: { [Op.like]: `%${filtros.search}%` } },
        { apellido_paterno: { [Op.like]: `%${filtros.search}%` } },
        { apellido_materno: { [Op.like]: `%${filtros.search}%` } },
        { razon_social: { [Op.like]: `%${filtros.search}%` } },
        { rfc: { [Op.like]: `%${filtros.search}%` } },
        { correo: { [Op.like]: `%${filtros.search}%` } },
      ];
    }

    return whereCondition;
  }

  // Buscar clientes con filtros avanzados y caché
  static async buscarClientesConCache(filtros: any) {
    const cacheKey = CacheKeys.CLIENTES_LIST(JSON.stringify(filtros));
    
    // Intentar obtener del caché
    let result = await CacheService.get(cacheKey);
    
    if (!result) {
      const whereCondition = await this.buscarClientes(filtros);
      
      // Ejecutar consulta
      const clientes = await Cliente.findAll({
        where: whereCondition,
        include: [
          {
            model: IngresoCliente,
            as: 'ingresos'
          }
        ],
        order: [['created_at', 'DESC']]
      });
      
      result = clientes;
      
      // Guardar en caché por 5 minutos
      await CacheService.set(cacheKey, result, CacheTTL.SHORT);
    }
    
    return result;
  }

  // Obtener clientes con paginación
  static async getClientesPaginado(page: number = 1, limit: number = 10, filtros: any = {}) {
    const offset = (page - 1) * limit;
    const whereCondition = await this.buscarClientes(filtros);
    
    const { count, rows } = await Cliente.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: IngresoCliente,
          as: 'ingresos'
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      clientes: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        hasNext: page < Math.ceil(count / limit),
        hasPrev: page > 1
      }
    };
  }

  // Obtener todos los clientes (sin paginación, para estadísticas)
  static async getAllClientes() {
    return await Cliente.findAll({
      include: [
        {
          model: IngresoCliente,
          as: 'ingresos'
        }
      ]
    });
  }

  // Obtener clientes por IDs específicos
  static async getClientesByIds(ids: number[]) {
    return await Cliente.findAll({
      where: {
        cliente_id: {
          [Op.in]: ids
        }
      },
      include: [
        {
          model: IngresoCliente,
          as: 'ingresos'
        }
      ]
    });
  }

  // ==================== GESTIÓN DE INGRESOS ====================

  // Crear ingreso para cliente existente
  static async createIngresoCliente(clienteId: number, ingresoData: any) {
    return await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Verificar que el cliente existe
      const cliente = await Cliente.findByPk(clienteId, { transaction });
      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const ingreso = await IngresoCliente.create({
        ...ingresoData,
        cliente_id: clienteId
      }, { transaction });

      // Invalidar caché relacionado
      await CacheService.del(`resumen_financiero:${clienteId}`);
      await CacheService.del(`estadisticas:ingresos:${clienteId}`);
      await CacheService.del(`ingresos:cliente:${clienteId}`);
      
      return ingreso;
    });
  }

  // Obtener ingresos de un cliente
  static async getIngresosCliente(clienteId: number) {
    const cacheKey = `ingresos:cliente:${clienteId}`;
    
    let ingresos = await CacheService.get(cacheKey);
    
    if (!ingresos) {
      ingresos = await IngresoCliente.findAll({
        where: { cliente_id: clienteId },
        order: [['fecha_registro', 'DESC']]
      });
      
      await CacheService.set(cacheKey, ingresos, CacheTTL.MEDIUM);
    }
    
    return ingresos;
  }

  // Obtener resumen financiero del cliente con caché
  static async getResumenFinanciero(clienteId: number) {
    const cacheKey = `resumen_financiero:${clienteId}`;
    
    let resumen = await CacheService.get(cacheKey);
    
    if (!resumen) {
      const cliente = await Cliente.findByPk(clienteId, {
        include: [
          { model: IngresoCliente, as: 'ingresos' },
        ],
      });

      if (!cliente) {
        throw new Error('Cliente no encontrado');
      }

      const ingresoMasReciente = await IngresoCliente.findOne({
        where: { cliente_id: clienteId },
        order: [['fecha_registro', 'DESC']],
      });

      const clienteData = cliente.toJSON() as any;

      resumen = {
        cliente,
        ingreso_actual: ingresoMasReciente,
        total_ingresos_registrados: clienteData.ingresos?.length || 0,
      };
      
      // Guardar en caché por 10 minutos
      await CacheService.set(cacheKey, resumen, CacheTTL.SHORT * 2);
    }

    return resumen;
  }

  // Obtener estadísticas de ingresos de un cliente específico
  static async getEstadisticasIngresos(clienteId: number) {
    const cacheKey = `estadisticas:ingresos:${clienteId}`;
    
    let estadisticas = await CacheService.get(cacheKey);
    
    if (!estadisticas) {
      const ingresos = await IngresoCliente.findAll({
        where: { cliente_id: clienteId },
        order: [['fecha_registro', 'DESC']]
      });

      if (ingresos.length === 0) {
        return {
          total_registros: 0,
          ingreso_promedio_anual: 0,
          ingreso_actual: null,
          historial: []
        };
      }

      const ingresoMasReciente = ingresos[0];
      const ingresoPromedio = ingresos.reduce((sum, ing) => {
        return sum + (parseFloat(ing.ingreso_anual?.toString() || '0'));
      }, 0) / ingresos.length;

      estadisticas = {
        total_registros: ingresos.length,
        ingreso_promedio_anual: Math.round(ingresoPromedio * 100) / 100,
        ingreso_actual: ingresoMasReciente,
        historial: ingresos.map(ing => ({
          fecha: ing.fecha_registro,
          ingreso_anual: ing.ingreso_anual,
          sector_economico: (ing as any).sector_economico || 'No especificado'
        }))
      };
      
      await CacheService.set(cacheKey, estadisticas, CacheTTL.MEDIUM);
    }
    
    return estadisticas;
  }

  // ==================== ESTADÍSTICAS Y ANÁLISIS ====================

  // Obtener estadísticas generales completas
  static async getEstadisticasGenerales() {
    const cacheKey = CacheKeys.DASHBOARD_STATS;
    
    let estadisticas = await CacheService.get(cacheKey);
    
    if (!estadisticas) {
      // Estadísticas básicas de clientes
      const totalClientes = await Cliente.count();
      
      const clientesPorTipo = await Cliente.findAll({
        attributes: [
          'tipo_persona',
          [sequelize.fn('COUNT', sequelize.col('cliente_id')), 'total']
        ],
        group: ['tipo_persona'],
        raw: true
      });
      
      const clientesPorEstado = await Cliente.findAll({
        attributes: [
          'estado',
          [sequelize.fn('COUNT', sequelize.col('cliente_id')), 'total']
        ],
        group: ['estado'],
        raw: true
      });

      // Estadísticas de actividad reciente
      const clientesUltimos30Dias = await Cliente.count({
        where: {
          created_at: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const clientesUltimos7Dias = await Cliente.count({
        where: {
          created_at: {
            [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      // Estadísticas de ingresos
      const ingresoPromedio = await IngresoCliente.findAll({
        attributes: [
          [sequelize.fn('AVG', sequelize.col('ingreso_anual')), 'promedio_anual'],
          [sequelize.fn('COUNT', sequelize.col('ingreso_id')), 'total_registros']
        ],
        raw: true
      });

      // Top 5 clientes más activos (con más ingresos registrados)
      const clientesMasActivos = await Cliente.findAll({
        attributes: [
          'cliente_id',
          'nombre',
          'apellido_paterno',
          'razon_social',
          'tipo_persona',
          [sequelize.fn('COUNT', sequelize.col('ingresos.ingreso_id')), 'total_ingresos']
        ],
        include: [
          {
            model: IngresoCliente,
            as: 'ingresos',
            attributes: []
          }
        ],
        group: ['cliente_id'],
        order: [[sequelize.fn('COUNT', sequelize.col('ingresos.ingreso_id')), 'DESC']],
        limit: 5,
        raw: true
      });
      
      estadisticas = {
        resumen: {
          total_clientes: totalClientes,
          nuevos_ultimos_30_dias: clientesUltimos30Dias,
          nuevos_ultimos_7_dias: clientesUltimos7Dias,
          fecha_actualizacion: new Date().toISOString()
        },
        distribucion: {
          por_tipo: clientesPorTipo,
          por_estado: clientesPorEstado
        },
        ingresos: {
          promedio_anual: (ingresoPromedio[0] as any)?.promedio_anual || 0,
          total_registros: (ingresoPromedio[0] as any)?.total_registros || 0
        },
        actividad: {
          clientes_mas_activos: clientesMasActivos.map(cliente => ({
            cliente_id: (cliente as any).cliente_id,
            nombre_completo: (cliente as any).tipo_persona === 'PM' 
              ? (cliente as any).razon_social 
              : `${(cliente as any).nombre} ${(cliente as any).apellido_paterno}`,
            tipo_persona: (cliente as any).tipo_persona,
            total_ingresos: (cliente as any).total_ingresos
          }))
        }
      };
      
      // Guardar en caché por 1 hora
      await CacheService.set(cacheKey, estadisticas, CacheTTL.LONG);
    }
    
    return estadisticas;
  }

  // Evaluar si un cliente es recurrente (basado en RFC)
  static async evaluarClienteRecurrente(rfc: string) {
    const cliente = await this.buscarClientePorRFC(rfc);
    
    if (!cliente) {
      return {
        es_recurrente: false,
        mensaje: 'Cliente no encontrado en el sistema'
      };
    }

    // Intentar obtener solicitudes y documentos si las asociaciones existen
    let totalSolicitudes = 0;
    let totalDocumentos = 0;

    try {
      // Asumir que estas asociaciones pueden existir
      const solicitudes = await (cliente as any).getSolicitudes?.() || [];
      totalSolicitudes = solicitudes.length;
    } catch (error) {
      // Si no existe la asociación, continuar
    }

    try {
      const documentos = await (cliente as any).getDocumentos?.() || [];
      totalDocumentos = documentos.length;
    } catch (error) {
      // Si no existe la asociación, continuar
    }

    return {
      es_recurrente: true,
      cliente_id: cliente.cliente_id,
      total_solicitudes: totalSolicitudes,
      total_documentos: totalDocumentos,
      ultima_actividad: cliente.updated_at,
      mensaje: 'Cliente encontrado en el sistema'
    };
  }

  // ==================== VALIDACIONES ====================

  // Validar integridad de datos según el tipo de persona
  static validarIntegridadDatos(cliente: any) {
    const errores: string[] = [];

    if (cliente.tipo_persona === 'PF' || cliente.tipo_persona === 'PF_AE') {
      if (!cliente.nombre) errores.push('El nombre es obligatorio para personas físicas');
      if (!cliente.apellido_paterno) errores.push('El apellido paterno es obligatorio para personas físicas');
      if (cliente.tipo_persona === 'PF' && cliente.fecha_constitucion) {
        errores.push('Las personas físicas no deben tener fecha de constitución');
      }
    }

    if (cliente.tipo_persona === 'PM') {
      if (!cliente.razon_social) errores.push('La razón social es obligatoria para personas morales');
      if (cliente.fecha_nacimiento) {
        errores.push('Las personas morales no deben tener fecha de nacimiento');
      }
    }

    if (cliente.rfc && !this.validarRFC(cliente.rfc)) {
      errores.push('El formato del RFC no es válido');
    }

    if (cliente.curp && !this.validarCURP(cliente.curp)) {
      errores.push('El formato del CURP no es válido');
    }

    return errores;
  }

  // Validar formato de RFC
  private static validarRFC(rfc: string): boolean {
    // Patrón para RFC de personas físicas: 4 letras + 6 dígitos + 3 caracteres
    const rfcPF = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;
    // Patrón para RFC de personas morales: 3 letras + 6 dígitos + 3 caracteres
    const rfcPM = /^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/;
    
    return rfcPF.test(rfc) || rfcPM.test(rfc);
  }

  // Validar formato de CURP
  private static validarCURP(curp: string): boolean {
    const curpPattern = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]$/;
    return curpPattern.test(curp);
  }

  // Verificar si puede proceder con onboarding
  static async puedeProcedeConOnboarding(clienteId: number) {
    const cliente = await this.getClienteById(clienteId);
    
    if (!cliente) {
      return {
        puede_proceder: false,
        razon: 'Cliente no encontrado',
        errores: [],
        completitud: 0
      };
    }

    const errores = this.validarIntegridadDatos(cliente);
    // TODO: Implementar cálculo de completitud cuando el modelo esté listo
    const completitud = 75; // Temporal hasta implementar getPorcentajeCompletitud()
    
    return {
      puede_proceder: errores.length === 0 && completitud >= 80,
      razon: errores.length > 0 ? 'Datos incompletos o inválidos' : 
             completitud < 80 ? 'Completitud insuficiente' : 'Listo para proceder',
      errores: errores,
      completitud: completitud
    };
  }
}
