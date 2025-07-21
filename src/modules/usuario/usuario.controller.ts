import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { Op, Transaction } from 'sequelize';
import { Usuario } from './usuario.model';
import { 
  createUsuarioSchema, 
  updateUsuarioSchema,
  loginSchema,
  changePasswordSchema,
  usuarioIdSchema, 
  usuarioFilterSchema 
} from './usuario.schema';
import { env } from '../../config/env';
import { TransactionService } from '../../services/transaction.service';
import { CacheService, CacheKeys, CacheTTL } from '../../config/cache';

export class UsuarioController {
  // Crear usuario
  public static createUsuario = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const validatedData = createUsuarioSchema.parse(req.body);
    
    await TransactionService.executeInTransaction(async (transaction: Transaction) => {
      // Verificar que el username y correo no existan
      const existingUser = await Usuario.findOne({
        where: {
          [Op.or]: [
            { username: validatedData.username },
            { correo: validatedData.correo }
          ]
        },
        transaction
      });
      
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'El username o correo ya están en uso',
        });
        return;
      }
      
      const { password, ...userData } = validatedData;
      const usuario = await Usuario.create({
        ...userData,
        password_hash: password, // Se hasheará automáticamente en el hook
      }, { transaction });
      
      // No retornar la contraseña
      const { password_hash, ...usuarioResponse } = usuario.toJSON();
      
      // Invalidar caché de usuarios
      await CacheService.delPattern('usuarios:*');
      
      res.status(201).json({
        success: true,
        message: 'Usuario creado exitosamente',
        data: usuarioResponse,
      });
    });
  });

  // Login
  public static login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username, password } = loginSchema.parse(req.body);
    
    const usuario = await Usuario.findOne({
      where: { username }
    });
    
    if (!usuario || !usuario.estaActivo()) {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas o usuario inactivo',
      });
      return;
    }
    
    const isValidPassword = await usuario.verificarPassword(password);
    
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
      return;
    }
    
    // Generar JWT
    const token = jwt.sign(
      { 
        usuario_id: usuario.usuario_id,
        username: usuario.username,
        rol: usuario.rol
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const { password_hash, ...usuarioResponse } = usuario.toJSON();
    
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        usuario: usuarioResponse,
        token,
      },
    });
  });

  // Obtener todos los usuarios con filtros
  public static getUsuarios = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const filters = usuarioFilterSchema.parse(req.query);
    const { page, limit, search, ...whereClause } = filters;
    
    const offset = (page - 1) * limit;
    
    // Agregar búsqueda si existe
    let whereCondition: any = { ...whereClause };
    if (search) {
      whereCondition[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { apellido: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
      ];
    }
    
    const { count, rows } = await Usuario.findAndCountAll({
      where: whereCondition,
      attributes: { exclude: ['password_hash'] },
      limit,
      offset,
      order: [['created_at', 'DESC']],
    });
    
    res.json({
      success: true,
      data: {
        usuarios: rows,
        pagination: {
          page,
          limit,
          total: count,
          pages: Math.ceil(count / limit),
        },
      },
    });
  });

  // Obtener usuario por ID
  public static getUsuarioById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = usuarioIdSchema.parse(req.params);
    
    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password_hash'] },
    });
    
    if (!usuario) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
      return;
    }
    
    res.json({
      success: true,
      data: usuario,
    });
  });

  // Actualizar usuario
  public static updateUsuario = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = usuarioIdSchema.parse(req.params);
    const validatedData = updateUsuarioSchema.parse(req.body);
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
      return;
    }
    
    // Si se está actualizando username o correo, verificar que no existan
    if (validatedData.username || validatedData.correo) {
      const existingUser = await Usuario.findOne({
        where: {
          usuario_id: { [Op.ne]: id },
          [Op.or]: [
            ...(validatedData.username ? [{ username: validatedData.username }] : []),
            ...(validatedData.correo ? [{ correo: validatedData.correo }] : []),
          ]
        }
      });
      
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'El username o correo ya están en uso',
        });
        return;
      }
    }
    
    const { password, ...updateData } = validatedData;
    const finalUpdateData = password 
      ? { ...updateData, password_hash: password }
      : updateData;
    
    await usuario.update(finalUpdateData);
    
    const { password_hash, ...usuarioResponse } = usuario.toJSON();
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioResponse,
    });
  });

  // Cambiar contraseña
  public static changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = usuarioIdSchema.parse(req.params);
    const validatedData = changePasswordSchema.parse(req.body);
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
      return;
    }
    
    // Verificar contraseña actual
    const isValidPassword = await usuario.verificarPassword(validatedData.password_actual);
    
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        message: 'Contraseña actual incorrecta',
      });
      return;
    }
    
    await usuario.update({ password_hash: validatedData.password_nuevo });
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
    });
  });

  // Eliminar usuario (suspender)
  public static deleteUsuario = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = usuarioIdSchema.parse(req.params);
    
    const usuario = await Usuario.findByPk(id);
    
    if (!usuario) {
      res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
      return;
    }
    
    // En lugar de eliminar, suspender el usuario
    await usuario.update({ estatus: 'suspendido' });
    
    res.json({
      success: true,
      message: 'Usuario suspendido exitosamente',
    });
  });

  // Obtener perfil del usuario actual
  public static getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const usuario = (req as any).usuario; // Viene del middleware de autenticación
    
    const { password_hash, ...usuarioResponse } = usuario.toJSON();
    
    res.json({
      success: true,
      data: usuarioResponse,
    });
  });
}
