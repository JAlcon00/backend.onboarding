import request from 'supertest';
import app from '../app';

// Script para probar el endpoint de completitud
async function testCompletitudEndpoint() {
  console.log('🔄 Probando endpoint de completitud...');
  
  try {
    // Primero necesitamos obtener un token de autenticación
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
    
    if (loginResponse.status !== 200) {
      console.error('❌ Error en login:', loginResponse.body);
      return;
    }
    
    const token = loginResponse.body.token;
    
    // Obtener lista de clientes
    const clientesResponse = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    
    if (clientesResponse.status !== 200) {
      console.error('❌ Error al obtener clientes:', clientesResponse.body);
      return;
    }
    
    const clientes = clientesResponse.body.data.clientes;
    
    if (clientes.length === 0) {
      console.log('⚠️ No hay clientes para probar');
      return;
    }
    
    // Probar completitud con el primer cliente
    const clienteId = clientes[0].cliente_id;
    console.log(`🔍 Probando completitud para cliente ID: ${clienteId}`);
    
    const completitudResponse = await request(app)
      .get(`/api/clientes/${clienteId}/completitud`)
      .set('Authorization', `Bearer ${token}`);
    
    console.log('📊 Status:', completitudResponse.status);
    console.log('📊 Respuesta:', JSON.stringify(completitudResponse.body, null, 2));
    
    // Probar endpoint de evaluación de cliente recurrente
    const rfc = clientes[0].rfc;
    console.log(`🔍 Probando evaluación recurrente para RFC: ${rfc}`);
    
    const recurrenteResponse = await request(app)
      .get(`/api/clientes/evaluar/rfc/${rfc}`)
      .set('Authorization', `Bearer ${token}`);
    
    console.log('📊 Status evaluación recurrente:', recurrenteResponse.status);
    console.log('📊 Respuesta evaluación recurrente:', JSON.stringify(recurrenteResponse.body, null, 2));
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  testCompletitudEndpoint();
}

export default testCompletitudEndpoint;
