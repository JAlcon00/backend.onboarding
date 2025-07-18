/**
 * Helpers para tests
 */
export * from './database';
export { 
  setupTestDatabase as setupCompleteTestEnvironment,
  teardownTestDatabase,
  createTestData 
} from './test-setup';

/**
 * Utilidades comunes para tests
 */
export const testUtils = {
  /**
   * Esperar un tiempo determinado
   */
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generar RFC aleatorio para pruebas
   */
  generateRandomRFC: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let rfc = '';
    
    // 4 letras
    for (let i = 0; i < 4; i++) {
      rfc += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // 6 números (fecha)
    rfc += '850101'; // Fecha fija para pruebas
    
    // 3 caracteres finales
    for (let i = 0; i < 3; i++) {
      rfc += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return rfc;
  },
  
  /**
   * Generar email aleatorio para pruebas
   */
  generateRandomEmail: () => {
    const timestamp = Date.now();
    return `test.${timestamp}@example.com`;
  },
  
  /**
   * Validar estructura de respuesta API
   */
  validateApiResponse: (response: any, expectedStatus: number = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    
    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('message');
    }
  }
};
