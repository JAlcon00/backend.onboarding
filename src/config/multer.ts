import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import { env } from './env';

const MAX_FILE_SIZE = env.MAX_FILE_SIZE || 10 * 1024 * 1024; // Default to 10MB for documents

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'image/tiff',
    'image/tif',
];

const storage = multer.memoryStorage();

function fileFilter(
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) {
  // Verificar tipo de archivo
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
}

// Configuración para subida de documentos individuales
export const uploadDocumento = multer({
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1, // Solo un archivo por vez
  },
  fileFilter,
}).single('documento');

// Configuración para subida múltiple de documentos
export const uploadMultiplesDocumentos = multer({
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 10, // Máximo 10 archivos
  },
  fileFilter,
}).array('documentos', 10);

// Configuración original para compatibilidad
export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'document', maxCount: 1 },
]);

export default upload;

