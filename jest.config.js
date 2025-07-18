module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'json', 'node'],
  // setupFiles: ['./jest.setup.js'], // Comentado hasta crear el archivo
  // Forzar que Jest termine cuando los tests completen
  forceExit: true,
  // Detectar handles abiertos
  detectOpenHandles: true,
  // Timeout por test
  testTimeout: 30000, // Aumentado para tests de integración
};