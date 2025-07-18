import { testDatabase } from './database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../../src/config/env';
import { Usuario } from '../../src/modules/usuario/usuario.model';

/**
 * Configuración completa del entorno de pruebas
 */
export const setupTestDatabase = async () => {
  console.log('🔧 Setting up test database...');
  
  try {
    // Configurar base de datos
    await testDatabase.setup();
    
    // Limpiar datos de prueba anteriores
    await testDatabase.clean();
    
    console.log('✅ Test database setup completed successfully.');
    
    return testDatabase;
  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  }
};

/**
 * Teardown del entorno de pruebas
 */
export const teardownTestDatabase = async () => {
  console.log('🔧 Tearing down test database...');
  
  try {
    // Limpiar datos de prueba
    await testDatabase.clean();
    
    // Cerrar conexión
    await testDatabase.close();
    
    console.log('✅ Test database teardown completed successfully.');
  } catch (error) {
    console.error('❌ Error tearing down test database:', error);
    throw error;
  }
};

/**
 * Helper para crear datos de prueba comunes
 */
export const createTestData = {
  /**
   * Crear cliente de prueba
   */
  cliente: async (overrides: any = {}) => {
    const defaultData = {
      tipo_persona: 'PF',
      nombre: 'Test',
      apellido_paterno: 'User',
      apellido_materno: 'Test',
      rfc: 'TEST850101ABC',
      curp: 'TEST850101HDFRNN01',
      fecha_nacimiento: '1985-01-01',
      correo: 'test@example.com',
      telefono: '5555555555',
      calle: 'Test Street',
      numero_exterior: '123',
      colonia: 'Test Colony',
      codigo_postal: '12345',
      ciudad: 'Test City',
      estado: 'Test State',
      pais: 'México'
    };
    
    return { ...defaultData, ...overrides };
  },
  
  /**
   * Crear usuario de prueba
   */
  usuario: async (overrides: any = {}) => {
    // Importar el modelo Usuario para usar el método hashPassword
    const { Usuario } = require('../../src/modules/usuario/usuario.model');
    
    // Usar contraseña en texto plano y generar el hash correctamente
    const password = overrides.password || 'password123';
    const hashedPassword = await Usuario.hashPassword(password);
    
    const defaultData = {
      nombre: 'Test Admin',
      apellido: 'Apellido',
      username: 'testadmin',
      correo: 'admin@test.com',
      password_hash: hashedPassword, // Hash bcrypt válido de 60 caracteres
      rol: 'ADMIN',
      estatus: 'activo'
    };
    
    return { ...defaultData, ...overrides };
  },
  
  /**
   * Crear solicitud de prueba
   */
  solicitud: async (clienteId: number, overrides: any = {}) => {
    const defaultData = {
      cliente_id: clienteId,
      productos: [
        {
          producto: 'CS',
          monto: 100000.00,
          plazo_meses: 12
        }
      ]
    };
    
    return { ...defaultData, ...overrides };
  },
  
  /**
   * Generar token JWT directamente sin crear usuario
   */
  createJWTToken: (payload: any = {}) => {
    const defaultPayload = {
      usuario_id: 1,
      username: 'testadmin',
      rol: 'ADMIN'
    };
    
    return jwt.sign(
      { ...defaultPayload, ...payload },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  },

  /**
   * Crear usuario real en BD y generar token JWT válido
   */
  createAdminUserAndToken: async (userData: any = {}) => {
    try {
      // Crear usuario con datos por defecto o personalizados
      const userToCreate = await createTestData.usuario(userData);
      
      // Eliminar usuario previo con el mismo correo si existe
      await Usuario.destroy({ where: { correo: userToCreate.correo } });
      
      // Crear usuario directamente usando el modelo
      const user = await Usuario.create(userToCreate);
      
      // Generar token JWT
      const token = jwt.sign(
        { 
          usuario_id: user.usuario_id,
          username: user.username || 'testadmin',
          rol: user.rol 
        },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return { user, token };
    } catch (error) {
      console.error('❌ Error creating admin user and token:', error);
      throw error;
    }
  }
};
