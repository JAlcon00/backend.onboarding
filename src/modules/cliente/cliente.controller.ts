import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Cliente } from './cliente.model';
import { IngresoCliente } from './ingresoCliente.model';
import { ClienteService } from './cliente.service';
import { 
  createClienteSchema, 
  updateClienteSchema, 
  clienteIdSchema, 
  clienteFilterSchema,
  createIngresoClienteSchema,
  updateIngresoClienteSchema 
} from './cliente.schema';

export class ClienteController {
  // Crear cliente
  public static createCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createClienteSchema.parse(req.body);
    
    try {
      const cliente = await ClienteService.createCliente(validatedData);
      
      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: {
          cliente,
          completitud: cliente.getPorcentajeCompletitud(),
          datos_basicos_completos: cliente.isDatosBasicosCompletos(),
          direccion_completa: cliente.isDireccionCompleta(),
        },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Error al crear el cliente',
      });
    }
  });

  // Obtener todos los clientes con filtros
  public static getClientes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = clienteFilterSchema.parse(req.query);
    const { page, limit, completed, search, ...whereClause } = filters;
    
    const offset = (page - 1) * limit;
    
    // Construir condiciones de búsqueda
    const searchConditions = await ClienteService.buscarClientes({ 
      ...whereClause, 
      search,
      completed 
    });
    
    const { count, rows } = await Cliente.findAndCountAll({
      where: searchConditions,
      include: [
        { 
          model: IngresoCliente, 
          as: 'ingresos',
          required: false,
          limit: 1,
          order: [['fecha_registro', 'DESC']]
        },
      ],
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });
    
    // Agregar información de completitud a cada cliente
    const clientesConCompletitud = rows.map(cliente => {
      const clienteJson = cliente.toJSON();
      return {
        ...clienteJson,
        completitud: cliente.getPorcentajeCompletitud(),
        datos_basicos_completos: cliente.isDatosBasicosCompletos(),
        direccion_completa: cliente.isDireccionCompleta(),
      };
    });
    
    res.json({
      success: true,
      data: {
        clientes: clientesConCompletitud,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  });

  // Obtener cliente por ID
  public static getClienteById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    const cliente = await ClienteService.getClienteById(id);
    
    if (!cliente) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }

    // Obtener resumen financiero
    const resumenFinanciero = await ClienteService.getResumenFinanciero(id);
    
    res.json({
      success: true,
      data: {
        ...cliente.toJSON(),
        completitud: cliente.getPorcentajeCompletitud(),
        datos_basicos_completos: cliente.isDatosBasicosCompletos(),
        direccion_completa: cliente.isDireccionCompleta(),
        resumen_financiero: resumenFinanciero,
      },
    });
  });

  // Actualizar cliente
  public static updateCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    const validatedData = updateClienteSchema.parse(req.body);
    
    try {
      const cliente = await ClienteService.updateCliente(id, validatedData);
      
      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: {
          ...cliente.toJSON(),
          completitud: cliente.getPorcentajeCompletitud(),
          datos_basicos_completos: cliente.isDatosBasicosCompletos(),
          direccion_completa: cliente.isDireccionCompleta(),
        },
      });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: error.message || 'Error al actualizar el cliente',
        });
      }
    }
  });

  // Eliminar cliente
  public static deleteCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }
    
    await cliente.destroy();
    
    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente',
    });
  });

  // Crear ingreso para cliente
  public static createIngresoCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    const validatedData = createIngresoClienteSchema.parse({
      ...req.body,
      cliente_id: id,
    });
    
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }
    
    const ingreso = await IngresoCliente.create(validatedData);
    
    res.status(201).json({
      success: true,
      message: 'Ingreso registrado exitosamente',
      data: ingreso,
    });
  });

  // Obtener ingresos de cliente
  public static getIngresosCliente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    const ingresos = await IngresoCliente.findAll({
      where: { cliente_id: id },
      order: [['fecha_registro', 'DESC']],
    });
    
    res.json({
      success: true,
      data: ingresos,
    });
  });

  // Buscar clientes por RFC
  public static buscarPorRFC = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { rfc } = req.params;
    
    if (!rfc || (rfc.length !== 12 && rfc.length !== 13)) {
      res.status(400).json({
        success: false,
        message: 'RFC debe tener 12 o 13 caracteres',
      });
      return;
    }
    
    try {
      const cliente = await ClienteService.buscarClientePorRFC(rfc);
      
        if (cliente) {
          res.json({
            success: true,
            data: {
              cliente_encontrado: true,
              cliente,
              completitud: cliente.getPorcentajeCompletitud(),
              datos_basicos_completos: cliente.isDatosBasicosCompletos(),
              direccion_completa: cliente.isDireccionCompleta(),
            },
            message: 'Cliente encontrado',
          });
        } else {
          res.json({
            success: true,
            data: {
              cliente_encontrado: false,
              rfc: rfc.toUpperCase(),
            },
            message: 'Cliente no encontrado - puede crear nuevo registro',
          });
        }
      } catch (error: any) {
        res.status(500).json({
          success: false,
          message: 'Error al buscar cliente por RFC',
          error: error.message,
        });
      }
    });  // Evaluar cliente recurrente por RFC
  public static evaluarClienteRecurrente = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { rfc } = req.params;
    
    if (!rfc || (rfc.length !== 12 && rfc.length !== 13)) {
      res.status(400).json({
        success: false,
        message: 'RFC debe tener 12 o 13 caracteres',
      });
      return;
    }
    
    try {
      const evaluacion = await ClienteService.evaluarClienteRecurrente(rfc);
      
      res.json({
        success: true,
        data: evaluacion,
        message: evaluacion.mensaje,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al evaluar cliente recurrente',
        error: error.message,
      });
    }
  });

  // Validar completitud del expediente
  public static validarCompletitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    try {
      const cliente = await ClienteService.getClienteById(id);
      
      if (!cliente) {
        res.status(404).json({
          success: false,
          message: 'Cliente no encontrado',
        });
        return;
      }
      
      const completitud = {
        porcentaje_completitud: cliente.getPorcentajeCompletitud(),
        datos_basicos_completos: cliente.isDatosBasicosCompletos(),
        direccion_completa: cliente.isDireccionCompleta(),
        mensaje_completitud: `Expediente ${cliente.getPorcentajeCompletitud()}% completo`
      };
      
      res.json({
        success: true,
        data: completitud,
        message: completitud.mensaje_completitud,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al evaluar completitud del expediente',
        error: error.message,
      });
    }
  });

  // Obtener estadísticas del cliente
  public static getEstadisticas = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const estadisticas = await ClienteService.getEstadisticasGenerales();
    
    res.json({
      success: true,
      data: estadisticas,
    });
  });

  // Obtener estado completo del onboarding
  public static getEstadoOnboarding = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    try {
      // Obtener información básica del cliente
      const cliente = await Cliente.findByPk(id);
      
      if (!cliente) {
        res.status(404).json({
          success: false,
          message: 'Cliente no encontrado',
        });
        return;
      }
      
      // Crear respuesta de completitud básica
      const estadoOnboarding = {
        cliente_id: cliente.cliente_id,
        tipo_persona: cliente.tipo_persona,
        tiene_datos_basicos: true,
        tiene_ingresos: false,
        tiene_solicitud: false,
        tiene_documentos: false,
        porcentaje_completitud: 25,
        puede_proceder: false
      };
      
      res.json({
        success: true,
        data: estadoOnboarding,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener el estado del onboarding',
      });
    }
  });

  // Verificar si puede proceder con onboarding
  public static verificarProcesoOnboarding = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    try {
      const verificacion = await ClienteService.puedeProcedeConOnboarding(id);
      
      res.json({
        success: true,
        data: verificacion,
      });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error al verificar el proceso de onboarding',
        });
      }
    }
  });

  // Obtener estadísticas de ingresos de un cliente específico
  public static getEstadisticasIngresos = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = clienteIdSchema.parse(req.params);
    
    try {
      const estadisticas = await ClienteService.getEstadisticasIngresos(id);
      
      res.json({
        success: true,
        data: estadisticas,
        message: 'Estadísticas de ingresos obtenidas exitosamente',
      });
    } catch (error: any) {
      if (error.message === 'Cliente no encontrado') {
        res.status(404).json({
          success: false,
          message: 'Cliente no encontrado',
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error al obtener estadísticas de ingresos',
          error: error.message,
        });
      }
    }
  });
}
