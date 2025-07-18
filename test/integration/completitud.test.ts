import request from 'supertest';
import { jest } from '@jest/globals';
import { beforeAll, afterAll, describe, test, expect } from '@jest/globals';
import app from '../../src/app';
import { setupTestDatabase, cleanTestData } from '../helpers/database';
import { Cliente } from '../../src/modules/cliente/cliente.model';
import { Documento } from '../../src/modules/documento/documento.model';
import { DocumentoTipo } from '../../src/modules/documento/documentoTipo.model';
import { Solicitud } from '../../src/modules/solicitud/solicitud.model';
import { Usuario } from '../../src/modules/usuario/usuario.model';
import bcrypt from 'bcrypt';
import { env } from '../../src/config/env';
import jwt from 'jsonwebtoken';

describe('Endpoint de Completitud', () => {
  let adminToken: string;
  let clienteId: number;

  beforeAll(async () => {
    await setupTestDatabase();

    // Crear usuario administrador
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await Usuario.create({
      nombre: 'Admin',
      apellido: 'Test',
      username: 'admin',
      correo: 'admin.completitud@test.com',
      password_hash: hashedPassword,
      rol: 'ADMIN',
      estatus: 'activo'
    });

    adminToken = jwt.sign(
      { 
        usuario_id: adminUser.usuario_id, 
        correo: adminUser.correo, 
        rol: adminUser.rol 
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear cliente de prueba
    const cliente = await Cliente.create({
      tipo_persona: 'PM',
      razon_social: 'Empresa Test S.A. de C.V.',
      representante_legal: 'Juan Pérez',
      rfc: 'ETE120315ABC',
      correo: 'empresa.test@email.com',
      telefono: '5555555555',
      calle: 'Av. Principal',
      numero_exterior: '123',
      colonia: 'Centro',
      codigo_postal: '01000',
      ciudad: 'Ciudad de México',
      estado: 'CDMX',
      pais: 'México',
      fecha_constitucion: new Date('2015-03-15')
    });

    clienteId = cliente.cliente_id;

    // Crear solicitud de prueba
    await Solicitud.create({
      cliente_id: clienteId,
      estatus: 'iniciada'
    });
  });

  afterAll(async () => {
    await cleanTestData();
  });

  describe('GET /api/clientes/:id/completitud', () => {
    test('debe retornar la completitud del expediente', async () => {
      const response = await request(app)
        .get(`/api/clientes/${clienteId}/completitud`)
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📊 Respuesta completitud:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.cliente_id).toBe(clienteId);
      expect(response.body.data.tipo_persona).toBe('PM');
      expect(response.body.data.completitud_porcentaje).toBeDefined();
      expect(response.body.data.datos_basicos_completos).toBeDefined();
      expect(response.body.data.direccion_completa).toBeDefined();
      expect(response.body.data.documentos_completos).toBeDefined();
      expect(response.body.data.expediente_completo).toBeDefined();
      expect(response.body.data.documentos_requeridos).toBeDefined();
      expect(response.body.data.resumen).toBeDefined();
      expect(response.body.data.siguiente_accion).toBeDefined();
      expect(response.body.data.puede_proceder).toBeDefined();
      expect(response.body.data.mensaje_completitud).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    test('debe retornar 404 para cliente inexistente', async () => {
      const response = await request(app)
        .get('/api/clientes/999999/completitud')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cliente no encontrado');
    });

    test('debe retornar 401 sin token de autenticación', async () => {
      const response = await request(app)
        .get(`/api/clientes/${clienteId}/completitud`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/clientes/evaluar/rfc/:rfc', () => {
    test('debe evaluar cliente recurrente existente', async () => {
      const response = await request(app)
        .get('/api/clientes/evaluar/rfc/ETE120315ABC')
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📊 Respuesta evaluación recurrente:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.es_cliente_recurrente).toBe(true);
      expect(response.body.data.documentos_vencidos).toBeDefined();
      expect(response.body.data.puede_reutilizar_documentos).toBeDefined();
      expect(response.body.data.mensaje).toBeDefined();
    });

    test('debe retornar cliente no recurrente para RFC inexistente', async () => {
      const response = await request(app)
        .get('/api/clientes/evaluar/rfc/XXXX000000XXX')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.es_cliente_recurrente).toBe(false);
      expect(response.body.data.mensaje).toBe('Cliente no encontrado en la base de datos');
    });

    test('debe retornar 400 para RFC inválido', async () => {
      const response = await request(app)
        .get('/api/clientes/evaluar/rfc/INVALID')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('RFC debe tener 12 o 13 caracteres');
    });
  });

  describe('Escenarios de completitud', () => {
    test('debe mostrar diferentes niveles de completitud', async () => {
      // Crear cliente con datos básicos incompletos
      const clienteIncompleto = await Cliente.create({
        tipo_persona: 'PF',
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        rfc: 'PERJ850315ABC',
        correo: 'juan.incompleto@test.com',
        pais: 'México'
        // Faltan: apellido_materno, curp, fecha_nacimiento, dirección completa
      });

      const response = await request(app)
        .get(`/api/clientes/${clienteIncompleto.cliente_id}/completitud`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.completitud_porcentaje).toBeLessThan(100);
      expect(response.body.data.datos_basicos_completos).toBe(false);
      expect(response.body.data.direccion_completa).toBe(false);
      expect(response.body.data.expediente_completo).toBe(false);
      expect(response.body.data.puede_proceder).toBe(false);
    });
  });
});
