import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import { env } from './env';
import { logError, logInfo } from './logger';
import Busboy from 'busboy';
import { validateFileType } from './multer';

const storage = new Storage({
  keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: env.GOOGLE_PROJECT_ID,
});

const bucket = storage.bucket(env.GOOGLE_BUCKET_NAME);

export interface StreamUploadOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  destination?: string;
}

export class StreamingUploadService {
  private static readonly DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly DEFAULT_MIME_TYPES = [
    'image/jpeg',
    'image/png', 
    'application/pdf',
    'image/tiff'
  ];

  /**
   * Upload directo a Google Cloud Storage usando streams
   * Evita cargar el archivo completo en memoria
   */
  static async uploadToGCS(
    req: Request,
    res: Response,
    options: StreamUploadOptions = {}
  ): Promise<{ success: boolean; files: any[]; errors: string[] }> {
    
    const {
      maxFileSize = this.DEFAULT_MAX_SIZE,
      allowedMimeTypes = this.DEFAULT_MIME_TYPES,
      destination = 'uploads'
    } = options;

    return new Promise((resolve) => {
      const busboy = Busboy({ 
        headers: req.headers,
        limits: {
          fileSize: maxFileSize,
          files: 10 // Máximo 10 archivos
        }
      });

      const uploadedFiles: any[] = [];
      const errors: string[] = [];
      let filesProcessed = 0;
      let totalFiles = 0;

      busboy.on('file', (fieldname: any, file: any, info: any) => {
        totalFiles++;
        const { filename, mimeType } = info;

        // Validar tipo de archivo
        if (!allowedMimeTypes.includes(mimeType)) {
          errors.push(`Tipo de archivo no permitido: ${mimeType} para ${filename}`);
          file.resume(); // Consumir el stream para evitar bloqueo
          filesProcessed++;
          return;
        }

        // Generar nombre único
        const timestamp = Date.now();
        const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const gcpFileName = `${destination}/${timestamp}_${safeName}`;

        // Crear stream hacia GCS
        const gcpFile = bucket.file(gcpFileName);
        const writeStream = gcpFile.createWriteStream({
          metadata: {
            contentType: mimeType,
            metadata: {
              originalName: filename,
              uploadedAt: new Date().toISOString(),
              fieldname
            }
          },
          resumable: false // Para archivos pequeños/medianos
        });

        let fileSize = 0;
        const chunks: Buffer[] = []; // Para validación de magic numbers

        file.on('data', (chunk: Buffer) => {
          fileSize += chunk.length;
          
          // Guardar primeros chunks para validación de magic numbers
          if (chunks.length < 10) {
            chunks.push(chunk);
          }
          
          // Verificar límite de tamaño
          if (fileSize > maxFileSize) {
            file.destroy();
            writeStream.destroy();
            errors.push(`Archivo ${filename} excede el tamaño máximo permitido`);
            filesProcessed++;
            return;
          }

          writeStream.write(chunk);
        });

        file.on('end', async () => {
          try {
            // Validar magic numbers con los primeros chunks
            const headerBuffer = Buffer.concat(chunks);
            const isValidMagic = await validateFileType(headerBuffer, mimeType);
            
            if (!isValidMagic) {
              writeStream.destroy();
              await gcpFile.delete().catch(() => {}); // Limpiar archivo inválido
              errors.push(`Archivo ${filename} falló la validación de contenido`);
              filesProcessed++;
              return;
            }

            writeStream.end();
          } catch (error) {
            logError(`Error validando archivo ${filename}:`, error as Error);
            errors.push(`Error procesando ${filename}`);
            filesProcessed++;
          }
        });

        file.on('error', (error: any) => {
          logError(`Error en stream de archivo ${filename}:`, error as Error);
          writeStream.destroy();
          errors.push(`Error leyendo archivo ${filename}`);
          filesProcessed++;
        });

        writeStream.on('error', (error) => {
          logError(`Error escribiendo archivo ${filename} a GCS:`, error);
          errors.push(`Error subiendo archivo ${filename}`);
          filesProcessed++;
        });

        writeStream.on('finish', () => {
          logInfo(`Archivo ${filename} subido exitosamente a ${gcpFileName}`);
          
          uploadedFiles.push({
            originalName: filename,
            filename: gcpFileName,
            mimeType,
            size: fileSize,
            fieldname,
            bucket: env.GOOGLE_BUCKET_NAME,
            url: `gs://${env.GOOGLE_BUCKET_NAME}/${gcpFileName}`
          });

          filesProcessed++;
          
          // Resolver cuando todos los archivos han sido procesados
          if (filesProcessed === totalFiles) {
            resolve({
              success: errors.length === 0,
              files: uploadedFiles,
              errors
            });
          }
        });
      });

      busboy.on('error', (error: any) => {
        logError('Error en Busboy:', error as Error);
        resolve({
          success: false,
          files: [],
          errors: ['Error procesando la subida de archivos']
        });
      });

      busboy.on('finish', () => {
        // Si no hay archivos, resolver inmediatamente
        if (totalFiles === 0) {
          resolve({
            success: false,
            files: [],
            errors: ['No se encontraron archivos para subir']
          });
        }
      });

      req.pipe(busboy);
    });
  }

  /**
   * Middleware Express para upload streaming
   */
  static streamingUpload(options: StreamUploadOptions = {}) {
    return async (req: Request, res: Response, next: any) => {
      try {
        const result = await this.uploadToGCS(req, res, options);
        
        if (result.success) {
          req.uploadedFiles = result.files;
          next();
        } else {
          res.status(400).json({
            success: false,
            message: 'Error subiendo archivos',
            errors: result.errors
          });
        }
      } catch (error) {
        logError('Error en streaming upload:', error as Error);
        res.status(500).json({
          success: false,
          message: 'Error interno del servidor'
        });
      }
    };
  }
}

// Extender el tipo Request para incluir uploadedFiles
declare global {
  namespace Express {
    interface Request {
      uploadedFiles?: any[];
    }
  }
}

export const streamingUpload = StreamingUploadService.streamingUpload;
