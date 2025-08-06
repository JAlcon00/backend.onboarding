import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';
import { env } from './env';
import { fileTypeFromBuffer } from 'file-type';
import { logError } from './logger';

const MAX_FILE_SIZE = env.MAX_FILE_SIZE || 10 * 1024 * 1024; // Default to 10MB for documents

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'image/tiff',
    'image/tif',
];

// Magic numbers para validación de archivos reales
const ALLOWED_MAGIC_NUMBERS = {
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'application/pdf': ['pdf'],
    'image/tiff': ['tiff', 'tif'],
};

const storage = multer.memoryStorage();

async function validateFileType(buffer: Buffer, declaredMimeType: string): Promise<boolean> {
    try {
        const fileTypeResult = await fileTypeFromBuffer(buffer);
        
        if (!fileTypeResult) {
            logError(`No se pudo determinar el tipo de archivo para mimetype declarado: ${declaredMimeType}`);
            return false;
        }

        const { ext, mime } = fileTypeResult;
        
        // Verificar que el magic number coincida con el mimetype declarado
        const allowedExtensions = ALLOWED_MAGIC_NUMBERS[declaredMimeType as keyof typeof ALLOWED_MAGIC_NUMBERS];
        
        if (!allowedExtensions) {
            logError(`Mimetype no soportado: ${declaredMimeType}`);
            return false;
        }

        if (!allowedExtensions.includes(ext)) {
            logError(`Magic number no coincide. Declarado: ${declaredMimeType}, Real: ${mime} (.${ext})`);
            return false;
        }

        return true;
    } catch (error) {
        logError(`Error validando tipo de archivo: ${error}`);
        return false;
    }
}

function fileFilter(
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) {
  // Primera validación: mimetype declarado
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`));
    return;
  }
  
  cb(null, true);
}

// Configuración para subida de documentos individuales con validación completa
export const uploadDocumento = multer({
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter,
}).single('documento');

// Middleware para validación adicional de magic numbers
export const validateMagicNumbers = async (req: Request, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  try {
    const isValid = await validateFileType(req.file.buffer, req.file.mimetype);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'El archivo no es válido. El contenido no coincide con la extensión declarada.',
      });
    }

    next();
  } catch (error) {
    logError(`Error en validación de magic numbers: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno validando el archivo',
    });
  }
};

// Configuración para subida múltiple con validación
export const uploadMultiplesDocumentos = multer({
  storage,
  limits: { 
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
}).array('documentos', 10);

// Middleware para validación múltiple de magic numbers
export const validateMultipleMagicNumbers = async (req: Request, res: any, next: any) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return next();
  }

  try {
    for (const file of files) {
      const isValid = await validateFileType(file.buffer, file.mimetype);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: `El archivo ${file.originalname} no es válido. El contenido no coincide con la extensión declarada.`,
        });
      }
    }

    next();
  } catch (error) {
    logError(`Error en validación múltiple de magic numbers: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno validando los archivos',
    });
  }
};

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

// Exportar funciones para otros módulos
export { validateFileType };

