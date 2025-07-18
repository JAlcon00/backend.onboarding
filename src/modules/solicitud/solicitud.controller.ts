import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Solicitud } from './solicitud.model';
import { SolicitudProducto } from './solicitudProducto.model';
import { Cliente } from '../cliente/cliente.model';
import { 
  createSolicitudSchema, 
  updateSolicitudSchema,
  createProductoSolicitudSchema,
  updateProductoSolicitudSchema,
  solicitudIdSchema, 
  solicitudFilterSchema,
  productoIdSchema
} from './solicitud.schema';

export class SolicitudController {
  // Crear solicitud con productos
  public static createSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createSolicitudSchema.parse(req.body);
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(validatedData.cliente_id);
    if (!cliente) {
      res.status(404).json({
        success: false,
        message: 'Cliente no encontrado',
      });
      return;
    }
    
    // Crear la solicitud
    const solicitud = await Solicitud.create({
      cliente_id: validatedData.cliente_id,
      estatus: 'iniciada',
    });
    
    // Crear los productos asociados
    const productos = await Promise.all(
      validatedData.productos.map(producto => 
        SolicitudProducto.create({
          solicitud_id: solicitud.solicitud_id,
          ...producto,
        })
      )
    );
    
    // Obtener solicitud completa con productos
    const solicitudCompleta = await Solicitud.findByPk(solicitud.solicitud_id, {
      include: [
        { model: Cliente, as: 'clienteSolicitud' },
        { model: SolicitudProducto, as: 'productos' },
      ],
    });
    
    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      data: solicitudCompleta,
    });
  });

  // Obtener todas las solicitudes con filtros
  public static getSolicitudes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = solicitudFilterSchema.parse(req.query);
    const { page, limit, fecha_desde, fecha_hasta, producto, monto_min, monto_max, ...whereClause } = filters;
    
    const offset = (page - 1) * limit;
    
    // Construir filtros de fecha
    let whereCondition: any = { ...whereClause };
    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha_creacion = {};
      if (fecha_desde) whereCondition.fecha_creacion.gte = new Date(fecha_desde);
      if (fecha_hasta) whereCondition.fecha_creacion.lte = new Date(fecha_hasta);
    }
    
    // Construir include con filtros de productos
    const includeOptions: any = [
      { model: Cliente, as: 'clienteSolicitud' },
    ];
    
    let productosWhere: any = {};
    if (producto) productosWhere.producto = producto;
    if (monto_min) productosWhere.monto = { ...productosWhere.monto, gte: monto_min };
    if (monto_max) productosWhere.monto = { ...productosWhere.monto, lte: monto_max };
    
    includeOptions.push({
      model: SolicitudProducto,
      as: 'productos',
      where: Object.keys(productosWhere).length > 0 ? productosWhere : undefined,
      required: Object.keys(productosWhere).length > 0, // INNER JOIN si hay filtros de productos
    });
    
    const { count, rows } = await Solicitud.findAndCountAll({
      where: whereCondition,
      include: includeOptions,
      limit,
      offset,
      order: [['fecha_creacion', 'DESC']],
      distinct: true, // Para evitar duplicados con JOINs
    });
    
    res.json({
      success: true,
      data: {
        solicitudes: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  });

  // Obtener solicitud por ID
  public static getSolicitudById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = solicitudIdSchema.parse(req.params);
    
    const solicitud = await Solicitud.findByPk(id, {
      include: [
        { model: Cliente, as: 'clienteSolicitud' },
        { model: SolicitudProducto, as: 'productos' },
      ],
    });
    
    if (!solicitud) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
      return;
    }
    
    res.json({
      success: true,
      data: solicitud,
    });
  });

  // Actualizar solicitud
  public static updateSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = solicitudIdSchema.parse(req.params);
    const validatedData = updateSolicitudSchema.parse(req.body);
    
    const solicitud = await Solicitud.findByPk(id);
    
    if (!solicitud) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
      return;
    }
    
    // Solo permitir cambios si la solicitud puede ser modificada
    if (!solicitud.puedeSerModificada() && validatedData.estatus !== 'en_revision' && validatedData.estatus !== 'aprobada' && validatedData.estatus !== 'rechazada') {
      res.status(400).json({
        success: false,
        message: 'La solicitud no puede ser modificada en su estado actual',
      });
      return;
    }
    
    await solicitud.update(validatedData);
    
    res.json({
      success: true,
      message: 'Solicitud actualizada exitosamente',
      data: solicitud,
    });
  });

  // Eliminar solicitud
  public static deleteSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = solicitudIdSchema.parse(req.params);
    
    const solicitud = await Solicitud.findByPk(id);
    
    if (!solicitud) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
      return;
    }
    
    if (!solicitud.puedeSerModificada()) {
      res.status(400).json({
        success: false,
        message: 'No se puede eliminar una solicitud que ya está en proceso',
      });
      return;
    }
    
    await solicitud.destroy();
    
    res.json({
      success: true,
      message: 'Solicitud eliminada exitosamente',
    });
  });

  // Agregar producto a solicitud existente
  public static addProductoToSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = solicitudIdSchema.parse(req.params);
    const validatedData = createProductoSolicitudSchema.parse(req.body);
    
    const solicitud = await Solicitud.findByPk(id);
    
    if (!solicitud) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
      return;
    }
    
    if (!solicitud.puedeSerModificada()) {
      res.status(400).json({
        success: false,
        message: 'No se pueden agregar productos a una solicitud en proceso',
      });
      return;
    }
    
    const producto = await SolicitudProducto.create({
      solicitud_id: id,
      ...validatedData,
    });
    
    res.status(201).json({
      success: true,
      message: 'Producto agregado a la solicitud',
      data: producto,
    });
  });

  // Actualizar producto de solicitud
  public static updateProductoSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { solicitudId, productoId } = productoIdSchema.parse(req.params);
    const validatedData = updateProductoSolicitudSchema.parse(req.body);
    
    const solicitud = await Solicitud.findByPk(solicitudId);
    
    if (!solicitud) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
      return;
    }
    
    if (!solicitud.puedeSerModificada()) {
      res.status(400).json({
        success: false,
        message: 'No se pueden modificar productos de una solicitud en proceso',
      });
      return;
    }
    
    const producto = await SolicitudProducto.findOne({
      where: {
        solicitud_producto_id: productoId,
        solicitud_id: solicitudId,
      },
    });
    
    if (!producto) {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado en esta solicitud',
      });
      return;
    }
    
    await producto.update(validatedData);
    
    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: producto,
    });
  });

  // Eliminar producto de solicitud
  public static deleteProductoSolicitud = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { solicitudId, productoId } = productoIdSchema.parse(req.params);
    
    const solicitud = await Solicitud.findByPk(solicitudId);
    
    if (!solicitud) {
      res.status(404).json({
        success: false,
        message: 'Solicitud no encontrada',
      });
      return;
    }
    
    if (!solicitud.puedeSerModificada()) {
      res.status(400).json({
        success: false,
        message: 'No se pueden eliminar productos de una solicitud en proceso',
      });
      return;
    }
    
    const producto = await SolicitudProducto.findOne({
      where: {
        solicitud_producto_id: productoId,
        solicitud_id: solicitudId,
      },
    });
    
    if (!producto) {
      res.status(404).json({
        success: false,
        message: 'Producto no encontrado en esta solicitud',
      });
      return;
    }
    
    await producto.destroy();
    
    res.json({
      success: true,
      message: 'Producto eliminado de la solicitud',
    });
  });
}
