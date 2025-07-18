import { Cliente } from './cliente.model';
import { IngresoCliente } from './ingresoCliente.model';
import { CreateClienteInput, UpdateClienteInput } from './cliente.schema';
import { Op } from 'sequelize';

export class ClienteService {
  // Crear cliente con validaciones de negocio
  static async createCliente(data: CreateClienteInput) {
    // Validar RFC único
    const existingRfc = await Cliente.findOne({ where: { rfc: data.rfc } });
    if (existingRfc) {
      throw new Error('Ya existe un cliente con este RFC');
    }

    // Validar correo único
    const existingEmail = await Cliente.findOne({ where: { correo: data.correo } });
    if (existingEmail) {
      throw new Error('Ya existe un cliente con este correo electrónico');
    }

    // Convertir fechas string a Date
    const clienteData = {
      ...data,
      fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
      fecha_constitucion: data.fecha_constitucion ? new Date(data.fecha_constitucion) : undefined,
    };

    return await Cliente.create(clienteData);
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

    // Filtro por completitud de expediente
    if (filtros.completed !== undefined) {
      // Este filtro requiere una consulta más compleja
      // Por ahora, lo manejamos a nivel de aplicación
      // TODO: Optimizar con consulta SQL si es necesario
    }

    return whereCondition;
  }

  // Actualizar cliente con validaciones
  static async updateCliente(id: number, data: UpdateClienteInput) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    // Validar RFC único si se está cambiando
    if (data.rfc && data.rfc !== cliente.rfc) {
      const existingRfc = await Cliente.findOne({ 
        where: { 
          rfc: data.rfc,
          cliente_id: { [Op.ne]: id }
        } 
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
        } 
      });
      if (existingEmail) {
        throw new Error('Ya existe un cliente con este correo electrónico');
      }
    }

    // Convertir fechas
    const updateData = {
      ...data,
      fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
      fecha_constitucion: data.fecha_constitucion ? new Date(data.fecha_constitucion) : undefined,
    };

    await cliente.update(updateData);
    return cliente;
  }

  // Obtener resumen financiero del cliente
  static async getResumenFinanciero(clienteId: number) {
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

    return {
      cliente,
      ingreso_actual: ingresoMasReciente,
      total_ingresos_registrados: clienteData.ingresos?.length || 0,
    };
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
    const rfcPattern = /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
    return rfcPattern.test(rfc);
  }

  // Validar formato de CURP
  private static validarCURP(curp: string): boolean {
    const curpPattern = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/;
    return curpPattern.test(curp);
  }

  // Obtener campos faltantes para completar el expediente
  static getCamposFaltantes(cliente: Cliente): string[] {
    const camposFaltantes: string[] = [];
    const camposRequeridos = cliente.getCamposRequeridosPublic();
    
    camposRequeridos.forEach(campo => {
      if (!cliente.esCampoCompletoPublic(campo)) {
        camposFaltantes.push(campo);
      }
    });
    
    return camposFaltantes;
  }

  // Obtener estadísticas generales de clientes
  static async getEstadisticasGenerales() {
    const totalClientes = await Cliente.count();
    
    const clientesPorTipo = await Cliente.findAll({
      attributes: [
        'tipo_persona',
        [Cliente.sequelize!.fn('COUNT', Cliente.sequelize!.col('cliente_id')), 'count']
      ],
      group: ['tipo_persona'],
      raw: true
    });

    const clientesPorEstado = await Cliente.findAll({
      attributes: [
        'estado',
        [Cliente.sequelize!.fn('COUNT', Cliente.sequelize!.col('cliente_id')), 'count']
      ],
      where: {
        estado: { [Op.not]: '' }
      },
      group: ['estado'],
      order: [[Cliente.sequelize!.fn('COUNT', Cliente.sequelize!.col('cliente_id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Estadísticas de ingresos
    const ingresoPromedio = await IngresoCliente.findOne({
      attributes: [
        [IngresoCliente.sequelize!.fn('AVG', IngresoCliente.sequelize!.col('ingreso_anual')), 'promedio']
      ],
      raw: true
    }) as any;

    const clientesConIngreso = await IngresoCliente.count({
      distinct: true,
      col: 'cliente_id'
    });

    return {
      total_clientes: totalClientes,
      clientes_por_tipo: clientesPorTipo,
      clientes_por_estado: clientesPorEstado,
      clientes_con_registro_ingreso: clientesConIngreso,
      porcentaje_con_ingreso: totalClientes > 0 ? Math.round((clientesConIngreso / totalClientes) * 100) : 0,
      ingreso_promedio: ingresoPromedio?.promedio || 0,
    };
  }

  // Verificar si un cliente puede proceder con el onboarding
  static async puedeProcedeConOnboarding(clienteId: number): Promise<{
    puede_proceder: boolean;
    motivos: string[];
    completitud: number;
  }> {
    const cliente = await Cliente.findByPk(clienteId);
    
    if (!cliente) {
      throw new Error('Cliente no encontrado');
    }

    const motivos: string[] = [];
    const errores = this.validarIntegridadDatos(cliente.toJSON());
    const completitud = cliente.getPorcentajeCompletitud();

    if (!cliente.isDatosBasicosCompletos()) {
      motivos.push('Los datos básicos del cliente están incompletos');
    }

    if (!cliente.isDireccionCompleta()) {
      motivos.push('La dirección del cliente está incompleta');
    }

    if (errores.length > 0) {
      motivos.push(...errores);
    }

    // Verificar si tiene al menos un registro de ingresos
    const tieneIngresos = await IngresoCliente.count({ where: { cliente_id: clienteId } });
    if (tieneIngresos === 0) {
      motivos.push('El cliente debe tener al menos un registro de ingresos');
    }

    return {
      puede_proceder: motivos.length === 0,
      motivos,
      completitud,
    };
  }
}
