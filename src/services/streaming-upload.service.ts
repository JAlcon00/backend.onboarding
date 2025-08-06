import { Storage } from '@google-cloud/storage';
import { Request, Response } from 'express';
import busboy from 'busboy';
import { PassThrough } from 'stream';
import { fileTypeFromBuffer } from 'file-type';
import { logError, logInfo } from '../config/logger';
import { ValidationError, InternalServerError } from '../types/errors';

interface FileUploadResult {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

interface StreamingUploadOptions {
  bucketName: string;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  folder?: string;
}

export class StreamingUploadService {
  private storage: Storage;
  private bucket: any;

  constructor(private options: StreamingUploadOptions) {
    this.storage = new Storage({
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    this.bucket = this.storage.bucket(options.bucketName);
  }

  /**
   * Valida el tipo de archivo usando magic numbers
   */
  private async validateFileType(chunk: Buffer, declaredMimeType: string): Promise<boolean> {
    try {
      const detectedType = await fileTypeFromBuffer(chunk);
      
      if (!detectedType) {
        return false;
      }

      // Lista de tipos MIME permitidos por defecto
      const defaultAllowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      const allowedTypes = this.options.allowedMimeTypes || defaultAllowedTypes;
      
      // Verificar si el tipo detectado está en la lista permitida
      if (!allowedTypes.includes(detectedType.mime)) {
        logError(`Tipo de archivo no permitido: ${detectedType.mime}`, new Error('Invalid file type'));
        return false;
      }

      // Verificar si el tipo declarado coincide con el detectado
      if (declaredMimeType !== detectedType.mime) {
        logError(`Tipo MIME declarado (${declaredMimeType}) no coincide con el detectado (${detectedType.mime})`, 
          new Error('MIME type mismatch'));
        return false;
      }

      return true;
    } catch (error) {
      logError('Error validando tipo de archivo', error as Error);
      return false;
    }
  }

  /**
   * Maneja la subida de archivos usando streaming
   */
  public async handleStreamingUpload(req: Request, res: Response): Promise<FileUploadResult[]> {
    return new Promise((resolve, reject) => {
      const uploadedFiles: FileUploadResult[] = [];
      const maxFileSize = this.options.maxFileSize || 50 * 1024 * 1024; // 50MB por defecto

      const bb = busboy({ 
        headers: req.headers,
        limits: {
          fileSize: maxFileSize,
          files: 5 // Máximo 5 archivos por request
        }
      });

      bb.on('file', (name: string, file: NodeJS.ReadableStream, info: busboy.FileInfo) => {
        const { filename, encoding, mimeType } = info;
        
        if (!filename) {
          file.resume();
          return;
        }

        logInfo(`Iniciando subida de archivo: ${filename}, tipo: ${mimeType}`);

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const uniqueFilename = `${timestamp}-${filename}`;
        const folder = this.options.folder || 'uploads';
        const fullPath = `${folder}/${uniqueFilename}`;

        // Crear stream de subida a Google Cloud Storage
        const cloudFile = this.bucket.file(fullPath);
        const stream = cloudFile.createWriteStream({
          metadata: {
            contentType: mimeType,
            metadata: {
              originalName: filename,
              uploadedAt: new Date().toISOString()
            }
          },
          resumable: false, // Para archivos pequeños, más eficiente
        });

        let fileSize = 0;
        let firstChunk = true;
        let validationPassed = false;

        // Crear un PassThrough stream para validación
        const validationStream = new PassThrough();

        file.on('data', (chunk: Buffer) => {
          fileSize += chunk.length;
          
          // Validar solo el primer chunk para detectar el tipo de archivo
          if (firstChunk) {
            this.validateFileType(chunk, mimeType)
              .then((isValid) => {
                if (isValid) {
                  validationPassed = true;
                  validationStream.write(chunk);
                } else {
                  (file as any).destroy?.();
                  stream.destroy();
                  reject(new ValidationError('Tipo de archivo no válido o no coincide con el contenido real'));
                }
              })
              .catch((error) => {
                (file as any).destroy?.();
                stream.destroy();
                reject(new InternalServerError('Error validando archivo'));
              });
            firstChunk = false;
          } else if (validationPassed) {
            validationStream.write(chunk);
          }
        });

        file.on('end', () => {
          if (validationPassed) {
            validationStream.end();
          }
        });

        file.on('error', (error: Error) => {
          logError(`Error en stream de archivo ${filename}`, error);
          stream.destroy();
          reject(new InternalServerError('Error procesando archivo'));
        });

        // Pipe del validation stream al cloud stream
        validationStream.pipe(stream);

        stream.on('error', (error: Error) => {
          logError(`Error subiendo archivo ${filename} a Google Cloud Storage`, error);
          reject(new InternalServerError('Error subiendo archivo'));
        });

        stream.on('finish', () => {
          logInfo(`Archivo ${filename} subido exitosamente. Tamaño: ${fileSize} bytes`);
          
          const fileResult: FileUploadResult = {
            filename: uniqueFilename,
            originalName: filename,
            size: fileSize,
            mimetype: mimeType,
            url: `gs://${this.options.bucketName}/${fullPath}`
          };

          uploadedFiles.push(fileResult);
        });
      });

      bb.on('finish', () => {
        logInfo(`Subida completada. Total de archivos: ${uploadedFiles.length}`);
        resolve(uploadedFiles);
      });

      bb.on('error', (error: Error) => {
        logError('Error en busboy', error);
        reject(new InternalServerError('Error procesando formulario'));
      });

      // Conectar el request al busboy
      req.pipe(bb);
    });
  }

  /**
   * Elimina un archivo del storage
   */
  public async deleteFile(filePath: string): Promise<void> {
    try {
      await this.bucket.file(filePath).delete();
      logInfo(`Archivo eliminado: ${filePath}`);
    } catch (error) {
      logError(`Error eliminando archivo ${filePath}`, error as Error);
      throw new InternalServerError('Error eliminando archivo');
    }
  }

  /**
   * Obtiene una URL firmada para acceso temporal al archivo
   */
  public async getSignedUrl(filePath: string, expiresInMinutes: number = 60): Promise<string> {
    try {
      const [url] = await this.bucket.file(filePath).getSignedUrl({
        action: 'read',
        expires: Date.now() + (expiresInMinutes * 60 * 1000),
      });
      return url;
    } catch (error) {
      logError(`Error generando URL firmada para ${filePath}`, error as Error);
      throw new InternalServerError('Error generando URL de acceso');
    }
  }

  /**
   * Verifica si un archivo existe
   */
  public async fileExists(filePath: string): Promise<boolean> {
    try {
      const [exists] = await this.bucket.file(filePath).exists();
      return exists;
    } catch (error) {
      logError(`Error verificando existencia de archivo ${filePath}`, error as Error);
      return false;
    }
  }
}

// Instancia por defecto para documentos
export const documentStreamingUpload = new StreamingUploadService({
  bucketName: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'onboarding-documents',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  folder: 'documentos',
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
});
