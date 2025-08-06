module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'json', 'node'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Forzar que Jest termine cuando los tests completen
  forceExit: true,
  // Detectar handles abiertos
  detectOpenHandles: true,
  // Timeout por test
  testTimeout: 30000,
  // Configuración de transformación para archivos TypeScript
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tsconfig.json',
      isolatedModules: true,
    }],
  },
  // Patterns de archivos de test
  testMatch: [
    '**/test/**/*.test.ts',
    '**/test/**/*.test.js',
    '**/__tests__/**/*.(ts|js)',
    '**/*.(test|spec).(ts|js)'
  ],
  // Paths a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  // Configuración de coverage
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,js}',
    '!src/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};