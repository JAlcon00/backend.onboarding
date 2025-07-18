// import request from 'supertest';
// import app from '../../src/app';
// import { setupTestDatabase, createTestData } from '../helpers/test-setup';
// import { DocumentoTipo } from '../../src/modules/documento/documentoTipo.model';
// import { Cliente } from '../../src/modules/cliente/cliente.model';

// describe('Debug: Flujo de Documentos', () => {
//   let adminToken: string;
//   let clienteTest: any;

//   beforeAll(async () => {
//     await setupTestDatabase();
    
//     // Crear usuario administrador
//     const { user, token } = await createTestData.createAdminUserAndToken({
//       nombre: 'Admin BackOffice',
//       apellido: 'Test',
//       username: 'admin_debug',
//       correo: 'admin@debug.test',
//       rol: 'ADMIN'
//     });
    
//     adminToken = token;
//   });

//   test('1. Verificar tipos de documento en BD', async () => {
//     const tiposEnBD = await DocumentoTipo.findAll({
//       where: { aplica_pf: true },
//       order: [['documento_tipo_id', 'ASC']]
//     });
    
//     console.log('🔍 Tipos en BD para PF:');
//     tiposEnBD.forEach(tipo => {
//       console.log(`   - ID ${tipo.documento_tipo_id}: ${tipo.nombre} (aplica_pf: ${tipo.aplica_pf})`);
//     });
    
//     expect(tiposEnBD.length).toBeGreaterThan(0);
//   });

//   test('2. Crear cliente de prueba', async () => {
//     const clienteData = {
//       nombre: 'Maria',
//       apellido_paterno: 'Fernandez',
//       apellido_materno: 'Garcia',
//       tipo_persona: 'PF',
//       rfc: 'FEMM850101AAA',
//       correo: 'maria.fernandez@test.com',
//       telefono: '5551234567'
//     };

//     const response = await request(app)
//       .post('/api/clientes')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send(clienteData);

//     console.log('Cliente creado:', response.body);
//     expect(response.status).toBe(201);
    
//     // La respuesta puede tener diferentes estructuras según el controlador
//     clienteTest = response.body.data.cliente || response.body.data;
//   });

//   test('3. Intentar subir documento con el primer tipo disponible', async () => {
//     if (!clienteTest) {
//       throw new Error('Cliente no creado');
//     }

//     // Obtener el primer tipo disponible
//     const primerTipo = await DocumentoTipo.findOne({
//       where: { aplica_pf: true },
//       order: [['documento_tipo_id', 'ASC']]
//     });

//     console.log('🔍 Primer tipo a usar:', primerTipo?.toJSON());

//     if (!primerTipo) {
//       throw new Error('No hay tipos de documento para PF');
//     }

//     const documentoData = {
//       cliente_id: clienteTest.cliente_id,
//       documento_tipo_id: primerTipo.documento_tipo_id,
//       archivo_url: `https://storage.googleapis.com/test/documento_${clienteTest.cliente_id}.pdf`,
//       fecha_documento: '2024-01-15'
//     };

//     console.log('🔍 Datos del documento a subir:', documentoData);

//     const response = await request(app)
//       .post('/api/documentos')
//       .set('Authorization', `Bearer ${adminToken}`)
//       .send(documentoData);

//     console.log('🔍 Response status:', response.status);
//     console.log('🔍 Response body:', response.body);

//     if (response.status !== 201) {
//       console.error('❌ Error completo:', JSON.stringify(response.body, null, 2));
//     }

//     expect(response.status).toBe(201);
//   });

//   test('4. Verificar que el cliente tiene tipo_persona PF', async () => {
//     if (!clienteTest) {
//       throw new Error('Cliente no creado');
//     }

//     const cliente = await Cliente.findByPk(clienteTest.cliente_id);
//     console.log('🔍 Cliente desde BD:', cliente?.toJSON());
    
//     expect(cliente?.tipo_persona).toBe('PF');
//   });

//   test('5. Verificar método aplicaATipoPersona', async () => {
//     const primerTipo = await DocumentoTipo.findOne({
//       where: { aplica_pf: true },
//       order: [['documento_tipo_id', 'ASC']]
//     });

//     if (!primerTipo) {
//       throw new Error('No hay tipos de documento para PF');
//     }

//     console.log('🔍 Verificando aplicaATipoPersona para PF...');
//     const aplicaPF = primerTipo.aplicaATipoPersona('PF');
//     console.log(`🔍 ¿Aplica a PF? ${aplicaPF}`);
//     console.log(`🔍 aplica_pf campo: ${primerTipo.aplica_pf}`);
    
//     expect(aplicaPF).toBe(true);
//   });
// });
