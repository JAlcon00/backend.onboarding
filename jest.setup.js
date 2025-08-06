// Configurar variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_USER = 'onboarding_test';
process.env.DB_PASSWORD = 'password123';
process.env.DB_NAME = 'onboarding_test';
process.env.JWT_SECRET = 'test-secret-key-very-long';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock console methods para tests más limpios
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Timeout global para tests
jest.setTimeout(30000);

// Configurar timezone
process.env.TZ = 'UTC';

// Mock de Google Cloud Storage para tests
jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({
      file: jest.fn().mockReturnValue({
        createWriteStream: jest.fn().mockReturnValue({
          on: jest.fn(),
          write: jest.fn(),
          end: jest.fn(),
        }),
        delete: jest.fn().mockResolvedValue([]),
        exists: jest.fn().mockResolvedValue([true]),
        getSignedUrl: jest.fn().mockResolvedValue(['https://example.com/signed-url']),
      }),
    }),
  })),
}));

// Mock de Redis para tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    flushdb: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
  })),
}));

// Cleanup después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
