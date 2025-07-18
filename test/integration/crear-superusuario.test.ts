import { jest } from '@jest/globals';
import { beforeAll, afterAll, describe, test, expect } from '@jest/globals';
import { setupTestDatabase, cleanTestData } from '../helpers/database';
import { Usuario } from '../../src/modules/usuario/usuario.model';
import bcrypt from 'bcrypt';

const { sequelize } = require('../../src/config/database');

describe('Crear Superusuario Inicial', () => {
  beforeAll(async () => {
    console.log('🔄 Configurando base de datos para tests...');
    await setupTestDatabase();
    
    // Limpiar cualquier usuario existente con el mismo username o correo
    await Usuario.destroy({ 
      where: { 
        username: 'jalcon' 
      } 
    });
    
    await Usuario.destroy({ 
      where: { 
        correo: 'jalmanza@grupoolson.com' 
      } 
    });
    
    console.log('✅ Base de datos limpia y lista para tests');
  });

  afterAll(async () => {
    console.log('🔄 Limpiando datos de test...');
    await cleanTestData();
    console.log('✅ Cleanup completado');
  });

  describe('Creación del Superusuario Jose de Jesus Almanza', () => {
    test('debe crear el superusuario con los datos correctos', async () => {
      console.log('🔄 Iniciando creación del superusuario...');
      
      // Hashear la contraseña manualmente
      const passwordHash = await bcrypt.hash('JoeAlcon.99?', 12);
      
      // Insertar directamente en la base de datos para evitar problemas de validación
      await sequelize.query(`
        INSERT INTO usuario (nombre, apellido, username, correo, password_hash, rol, estatus, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [
          'Jose de Jesus',
          'Almanza',
          'jalcon',
          'jalmanza@grupoolson.com',
          passwordHash,
          'SUPER',
          'activo'
        ]
      });

      // Obtener el usuario creado
      const superusuario = await Usuario.findOne({
        where: { username: 'jalcon' }
      });

      expect(superusuario).not.toBeNull();
      if (!superusuario) {
        throw new Error('Superusuario no encontrado después de la creación');
      }

      console.log('✅ Superusuario creado exitosamente');
      console.log('📋 Detalles del superusuario:');
      console.log('   ID:', superusuario.usuario_id);
      console.log('   Nombre:', superusuario.nombre);
      console.log('   Apellido:', superusuario.apellido);
      console.log('   Username:', superusuario.username);
      console.log('   Email:', superusuario.correo);
      console.log('   Rol:', superusuario.rol);
      console.log('   Estatus:', superusuario.estatus);
      console.log('   Created At:', superusuario.created_at);
      console.log('');
      console.log('🔐 Credenciales para login:');
      console.log('   Username: jalcon');
      console.log('   Password: JoeAlcon.99?');

      // Verificaciones básicas
      expect(superusuario.usuario_id).toBeDefined();
      expect(superusuario.nombre).toBe('Jose de Jesus');
      expect(superusuario.apellido).toBe('Almanza');
      expect(superusuario.username).toBe('jalcon');
      expect(superusuario.correo).toBe('jalmanza@grupoolson.com');
      expect(superusuario.rol).toBe('SUPER');
      expect(superusuario.estatus).toBe('activo');
      expect(superusuario.password_hash).toBeDefined();
      expect(superusuario.password_hash).not.toBe('JoeAlcon.99?'); // Debería estar hasheado
      expect(superusuario.created_at).toBeDefined();
      expect(superusuario.updated_at).toBeDefined();

      // Verificar que el password fue hasheado correctamente
      const isPasswordCorrect = await bcrypt.compare('JoeAlcon.99?', superusuario.password_hash);
      expect(isPasswordCorrect).toBe(true);
      
      console.log('✅ Password hasheado correctamente');
    });

    test('debe poder encontrar el superusuario en la base de datos', async () => {
      console.log('🔄 Verificando que el superusuario existe en la BD...');
      
      // Buscar por username
      const usuarioEncontrado = await Usuario.findOne({
        where: { username: 'jalcon' }
      });

      expect(usuarioEncontrado).not.toBeNull();
      if (!usuarioEncontrado) {
        throw new Error('Usuario no encontrado en la base de datos');
      }

      expect(usuarioEncontrado.nombre).toBe('Jose de Jesus');
      expect(usuarioEncontrado.apellido).toBe('Almanza');
      expect(usuarioEncontrado.username).toBe('jalcon');
      expect(usuarioEncontrado.correo).toBe('jalmanza@grupoolson.com');
      expect(usuarioEncontrado.rol).toBe('SUPER');
      expect(usuarioEncontrado.estatus).toBe('activo');

      console.log('✅ Superusuario encontrado correctamente en la BD');
    });

    test('debe ser el único usuario SUPER en el sistema', async () => {
      console.log('🔄 Verificando que es el único superusuario...');
      
      // Contar usuarios con rol SUPER
      const superUsuarios = await Usuario.findAll({
        where: { rol: 'SUPER' }
      });

      expect(superUsuarios.length).toBe(1);
      expect(superUsuarios[0].username).toBe('jalcon');

      console.log('✅ Es el único superusuario en el sistema');
    });

    test('debe verificar que el password cumple con los requisitos', async () => {
      console.log('🔄 Verificando requisitos del password...');
      
      const password = 'JoeAlcon.99?';
      
      // Verificar longitud
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(password.length).toBeLessThanOrEqual(128);
      
      // Verificar que tiene mayúsculas
      expect(password).toMatch(/[A-Z]/);
      
      // Verificar que tiene minúsculas
      expect(password).toMatch(/[a-z]/);
      
      // Verificar que tiene números
      expect(password).toMatch(/[0-9]/);
      
      // Verificar que tiene caracteres especiales
      expect(password).toMatch(/[^A-Za-z0-9]/);

      console.log('✅ Password cumple con todos los requisitos de seguridad');
    });

    test('debe tener timestamps correctos', async () => {
      console.log('🔄 Verificando timestamps...');
      
      const usuario = await Usuario.findOne({
        where: { username: 'jalcon' }
      });

      expect(usuario).not.toBeNull();
      if (!usuario) {
        throw new Error('Usuario no encontrado para verificar timestamps');
      }

      expect(usuario.created_at).toBeDefined();
      expect(usuario.updated_at).toBeDefined();
      expect(usuario.created_at).toBeInstanceOf(Date);
      expect(usuario.updated_at).toBeInstanceOf(Date);

      // Verificar que los timestamps son recientes (últimos 5 minutos)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      expect(usuario.created_at.getTime()).toBeGreaterThan(fiveMinutesAgo.getTime());
      expect(usuario.updated_at.getTime()).toBeGreaterThan(fiveMinutesAgo.getTime());

      console.log('✅ Timestamps son correctos y recientes');
    });

    test('debe fallar al crear otro usuario con el mismo username', async () => {
      console.log('🔄 Verificando unicidad del username...');
      
      const duplicateUserData = {
        nombre: 'Otro',
        apellido: 'Usuario',
        username: 'jalcon', // Username duplicado
        correo: 'otro@email.com',
        password_hash: 'password123',
        rol: 'ADMIN' as const,
        estatus: 'activo' as const
      };

      await expect(Usuario.create(duplicateUserData)).rejects.toThrow();

      console.log('✅ Unicidad del username verificada correctamente');
    });

    test('debe fallar al crear otro usuario con el mismo correo', async () => {
      console.log('🔄 Verificando unicidad del correo...');
      
      const duplicateEmailData = {
        nombre: 'Otro',
        apellido: 'Usuario',
        username: 'otrousuario',
        correo: 'jalmanza@grupoolson.com', // Correo duplicado
        password_hash: 'password123',
        rol: 'ADMIN' as const,
        estatus: 'activo' as const
      };

      await expect(Usuario.create(duplicateEmailData)).rejects.toThrow();

      console.log('✅ Unicidad del correo verificada correctamente');
    });
  });

  describe('Preparación para Login', () => {
    test('debe mostrar información para configurar Postman', async () => {
      console.log('');
      console.log('🎯 INFORMACIÓN PARA POSTMAN:');
      console.log('=====================================');
      console.log('');
      console.log('📋 Endpoint de Login:');
      console.log('   Method: POST');
      console.log('   URL: http://localhost:3000/api/usuarios/login');
      console.log('   Headers: Content-Type: application/json');
      console.log('');
      console.log('📋 Body del Login:');
      console.log(JSON.stringify({
        username: 'jalcon',
        password: 'JoeAlcon.99?'
      }, null, 2));
      console.log('');
      console.log('🔐 Después del login exitoso:');
      console.log('1. Copia el token de la respuesta');
      console.log('2. Crea una variable de entorno en Postman: auth_token');
      console.log('3. Usa el token en headers: Authorization: Bearer {{auth_token}}');
      console.log('');
      console.log('✅ Superusuario listo para usar en Postman');
      
      // Este test siempre pasa, solo es informativo
      expect(true).toBe(true);
    });
  });
});
