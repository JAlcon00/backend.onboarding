/**
 * Script de demostración de normalización de documentos
 * 
 * Este script muestra cómo el sistema normaliza nombres de archivos y carpetas
 * eliminando acentos y caracteres especiales para cumplir con estándares de
 * almacenamiento en la nube.
 */

import { storageService } from '../src/services/storage.service';

console.log('='.repeat(80));
console.log('🚀 DEMOSTRACIÓN DE NORMALIZACIÓN DE DOCUMENTOS');
console.log('='.repeat(80));

// Casos de prueba realistas
const casosEjemplo = [
  {
    titulo: '📄 Documentos de Identificación',
    ejemplos: [
      'Cédula de Identidad José María Pérez.pdf',
      'INE Señora Ñuñez & García.jpg',
      'Pasaporte María José Fernández-Rodríguez.png'
    ]
  },
  {
    titulo: '🏢 Documentos Empresariales',
    ejemplos: [
      'RFC Empresas Ñoño & Asociados S.A. de C.V.pdf',
      'Acta Constitutiva Café & Té México.pdf',
      'Poder Notarial José María González-Díaz.pdf'
    ]
  },
  {
    titulo: '📋 Folios y Referencias',
    ejemplos: [
      'SOL-JOSÉ-MARÍA-2024',
      'REQ#789@URGENTE&PRIORITARIO',
      'FOL/456-María José-Dic/2024'
    ]
  }
];

// Ejemplo de estructura de carpetas
console.log('\n1️⃣  NORMALIZACIÓN DE TEXTO BÁSICA');
console.log('-'.repeat(50));

casosEjemplo.forEach(({ titulo, ejemplos }) => {
  console.log(`\n${titulo}`);
  ejemplos.forEach(ejemplo => {
    const normalizado = storageService.testNormalizarTexto(ejemplo);
    console.log(`   ✅ "${ejemplo}"`);
    console.log(`   ➡️  "${normalizado}"`);
  });
});

console.log('\n\n2️⃣  GENERACIÓN DE NOMBRES DE ARCHIVO');
console.log('-'.repeat(50));

const tiposDocumento = ['INE', 'RFC', 'CURP', 'PASAPORTE'];
const ejemplosArchivos = [
  'identificación josé maría.pdf',
  'rfc & asociados ñuñez.jpg',
  'curp maría josé fernández.png'
];

tiposDocumento.forEach(tipo => {
  ejemplosArchivos.forEach(archivo => {
    const nombreGenerado = storageService.testGenerarNombreArchivo(tipo, archivo);
    console.log(`   📁 Tipo: ${tipo}`);
    console.log(`   📄 Original: "${archivo}"`);
    console.log(`   ✅ Generado: "${nombreGenerado}"`);
    console.log();
  });
});

console.log('\n3️⃣  ESTRUCTURA DE CARPETAS EN GOOGLE CLOUD STORAGE');
console.log('-'.repeat(50));

const ejemplosClientes = [
  {
    clienteId: 123,
    clienteNombre: 'José María Ñuñez & García',
    folioSolicitud: 'SOL-JOSÉ-MARÍA-2024'
  },
  {
    clienteId: 456,
    clienteNombre: 'Empresas Café & Té México S.A. de C.V.',
    folioSolicitud: 'REQ#789@URGENTE'
  },
  {
    clienteId: 789,
    clienteNombre: 'María José Fernández-Rodríguez',
    folioSolicitud: undefined // Sin folio
  }
];

ejemplosClientes.forEach(cliente => {
  const rutaGenerada = storageService.testGenerarRutaCarpeta(cliente);
  console.log(`   👤 Cliente: "${cliente.clienteNombre}" (ID: ${cliente.clienteId})`);
  console.log(`   📋 Folio: ${cliente.folioSolicitud || 'Sin folio'}`);
  console.log(`   📁 Estructura: "${rutaGenerada}"`);
  console.log();
});

console.log('\n4️⃣  EJEMPLO COMPLETO: SUBIDA DE DOCUMENTO');
console.log('-'.repeat(50));

const ejemploCompleto = {
  clienteId: 101,
  clienteNombre: 'José María Ñuñez & García',
  folioSolicitud: 'SOL-JOSÉ-2024',
  tipoDocumento: 'INE',
  nombreArchivo: 'Identificación Oficial José María.pdf'
};

const rutaCarpeta = storageService.testGenerarRutaCarpeta({
  clienteId: ejemploCompleto.clienteId,
  clienteNombre: ejemploCompleto.clienteNombre,
  folioSolicitud: ejemploCompleto.folioSolicitud
});

const nombreArchivo = storageService.testGenerarNombreArchivo(
  ejemploCompleto.tipoDocumento,
  ejemploCompleto.nombreArchivo
);

const rutaCompleta = `${rutaCarpeta}/${nombreArchivo}`;

console.log(`   👤 Cliente: "${ejemploCompleto.clienteNombre}"`);
console.log(`   📋 Folio: "${ejemploCompleto.folioSolicitud}"`);
console.log(`   📄 Archivo Original: "${ejemploCompleto.nombreArchivo}"`);
console.log(`   📁 Carpeta: "${rutaCarpeta}"`);
console.log(`   📄 Archivo Final: "${nombreArchivo}"`);
console.log(`   🔗 Ruta Completa: "${rutaCompleta}"`);

console.log('\n5️⃣  BENEFICIOS DE LA NORMALIZACIÓN');
console.log('-'.repeat(50));
console.log('   ✅ Eliminación de acentos y caracteres especiales');
console.log('   ✅ Compatibilidad con sistemas de almacenamiento en la nube');
console.log('   ✅ Prevención de errores de codificación de caracteres');
console.log('   ✅ Estructura consistente y predecible');
console.log('   ✅ Seguridad contra path traversal attacks');
console.log('   ✅ Fácil búsqueda y organización de archivos');

console.log('\n' + '='.repeat(80));
console.log('✨ DEMOSTRACIÓN COMPLETADA EXITOSAMENTE');
console.log('='.repeat(80));

export {};
