import { jest } from '@jest/globals';

// Configuración global para tests de seguridad
beforeAll(() => {
  // Configurar timeouts más largos para tests de seguridad
  jest.setTimeout(30000);
  
  // Configurar variables de entorno para tests
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-security-tests';
  process.env.DB_NAME = 'ONBOARDINGBYOLSON_TEST';
  
  // Configurar logging para tests
  if (process.env.TEST_VERBOSE !== 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

// Configuración después de cada test
afterEach(() => {
  // Limpiar mocks después de cada test
  jest.clearAllMocks();
});

// Configuración después de todos los tests
afterAll(() => {
  // Restaurar funciones originales
  jest.restoreAllMocks();
  
  // Forzar salida del proceso
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

// Configuración de matchers personalizados
expect.extend({
  toBeSecurePassword(received: string) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(received);
    const hasLowerCase = /[a-z]/.test(received);
    const hasNumbers = /\d/.test(received);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(received);
    
    const isSecure = 
      received.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChars;
    
    if (isSecure) {
      return {
        message: () => `expected ${received} not to be a secure password`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a secure password`,
        pass: false,
      };
    }
  },
  
  toHaveValidJWTStructure(received: string) {
    const parts = received.split('.');
    const hasThreeParts = parts.length === 3;
    
    if (!hasThreeParts) {
      return {
        message: () => `expected ${received} to have valid JWT structure (3 parts)`,
        pass: false,
      };
    }
    
    try {
      // Intentar decodificar el header y payload
      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      const hasValidHeader = header.alg && header.typ;
      const hasValidPayload = payload.exp && payload.iat;
      
      if (hasValidHeader && hasValidPayload) {
        return {
          message: () => `expected ${received} not to have valid JWT structure`,
          pass: true,
        };
      } else {
        return {
          message: () => `expected ${received} to have valid JWT structure`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () => `expected ${received} to have valid JWT structure`,
        pass: false,
      };
    }
  }
});

// Declaración de tipos para TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeSecurePassword(): R;
      toHaveValidJWTStructure(): R;
    }
  }
}

// Configuración de variables globales para tests
(global as any).TEST_CONFIG = {
  SECURITY_TESTS: true,
  TIMEOUT: 30000,
  RATE_LIMIT_THRESHOLD: 5,
  PASSWORD_MIN_LENGTH: 8,
  JWT_EXPIRATION: '1h',
  BCRYPT_ROUNDS: 12
};

// Helpers globales para tests de seguridad
(global as any).SecurityTestHelpers = {
  generateSecurePassword: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  },
  
  generateWeakPassword: () => {
    const weakPasswords = ['123456', 'password', 'qwerty', 'abc123'];
    return weakPasswords[Math.floor(Math.random() * weakPasswords.length)];
  },
  
  generateMaliciousInput: (type: 'xss' | 'sql' | 'script') => {
    const maliciousInputs = {
      xss: ['<script>alert("XSS")</script>', '<img src=x onerror=alert(1)>'],
      sql: ["'; DROP TABLE usuario; --", "' OR '1'='1"],
      script: ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']
    };
    
    const inputs = maliciousInputs[type];
    return inputs[Math.floor(Math.random() * inputs.length)];
  }
};

// Configuración de logging para tests de seguridad
if (process.env.SECURITY_TEST_LOGGING === 'true') {
  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    if (args[0] && args[0].includes('SECURITY')) {
      originalConsoleLog('[SECURITY TEST]', ...args);
    }
  };
}

export {};
