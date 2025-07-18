const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Iniciando prueba del servidor...');

// Compilar TypeScript
console.log('📝 Compilando TypeScript...');
const tscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');
const tscProcess = spawn(tscPath, ['--noEmit'], { 
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

tscProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Compilación exitosa');
    
    // Ejecutar servidor por unos segundos
    console.log('🚀 Iniciando servidor temporal...');
    const serverProcess = spawn('node', ['-r', 'ts-node/register', 'src/server.ts'], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    // Detener servidor después de 5 segundos
    setTimeout(() => {
      console.log('🛑 Deteniendo servidor de prueba...');
      serverProcess.kill('SIGINT');
    }, 5000);

    serverProcess.on('close', (serverCode) => {
      console.log('✅ Prueba del servidor completada');
      process.exit(0);
    });
  } else {
    console.log('❌ Error en compilación');
    process.exit(code);
  }
});

tscProcess.on('error', (err) => {
  console.error('❌ Error ejecutando TypeScript:', err);
  process.exit(1);
});
