import { Cliente } from './cliente.model';
import { IngresoCliente } from './ingresoCliente.model';
import { CreateClienteInput, UpdateClienteInput } from './cliente.schema';
import { Op, Transaction } from 'sequelize';
import { TransactionService } from '../../services/transaction.service';
import { CacheService, CacheKeys, CacheTTL } from '../../config/cache';

export class ClienteService {
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
}
