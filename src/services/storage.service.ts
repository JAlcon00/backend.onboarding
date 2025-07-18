import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import { env } from '../config/env';
import path from 'path';

interface UploadOptions {
  clienteId: number;
  clienteNombre: string;
  folioSolicitud?: string;
  tipoDocumento: string;
  reemplazar?: boolean;
}

export class StorageService {
  private storage: Storage;
  private bucketName: string;
  private bucket: any;

  constructor() {
    this.storage = new Storage({
      projectId: env.GOOGLE_PROJECT_ID,
      keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    this.bucketName = env.GOOGLE_BUCKET_NAME;
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Normaliza una cadena removiendo acentos y caracteres especiales
   * Preserva las extensiones de archivo (.pdf, .jpg, etc.)
   * @param texto Texto a normalizar
   * @returns Texto normalizado sin acentos ni caracteres especiales
   */
  private normalizarTexto(texto: string): string {
    // Verificar si es un nombre de archivo con extensión
    const extensionRegex = /\.(pdf|jpg|jpeg|png|tiff|gif|doc|docx|xls|xlsx|zip|rar)$/i;
    const tieneExtension = extensionRegex.test(texto);
    
    if (tieneExtension) {
      // Separar nombre y extensión
      const ultimoPunto = texto.lastIndexOf('.');
      const nombre = texto.substring(0, ultimoPunto);
      const extension = texto.substring(ultimoPunto); // Mantener la extensión original con el punto
      
      // Normalizar solo el nombre, preservar extensión
      const nombreNormalizado = nombre
        .normalize('NFD') // Descompone caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (acentos)
        .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N') // Convierte ñ a n
        .replace(/[^a-zA-Z0-9\s]/g, '') // Elimina caracteres especiales excepto espacios
        .replace(/\s+/g, '_') // Reemplaza espacios con guiones bajos
        .toUpperCase(); // Convierte a mayúsculas
      
      return nombreNormalizado + extension.toLowerCase(); // Extensión en minúsculas
    } else {
      // Normalización normal para texto sin extensión
      return texto
        .normalize('NFD') // Descompone caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Elimina los diacríticos (acentos)
        .replace(/[ñÑ]/g, (match) => match === 'ñ' ? 'n' : 'N') // Convierte ñ a n
        .replace(/[^a-zA-Z0-9\s]/g, '') // Elimina caracteres especiales excepto espacios
        .replace(/\s+/g, '_') // Reemplaza espacios con guiones bajos
        .toUpperCase(); // Convierte a mayúsculas
    }
  }

  /**
   * Genera la estructura de carpetas para un cliente
   * @param clienteId ID del cliente
   * @param clienteNombre Nombre del cliente (será normalizado)
   * @param folioSolicitud Folio de la solicitud (opcional)
   * @returns Ruta de la carpeta
   */
  private generarRutaCarpeta(clienteId: number, clienteNombre: string, folioSolicitud?: string): string {
    // Normalizar nombre del cliente eliminando acentos y caracteres especiales
    const nombreNormalizado = this.normalizarTexto(clienteNombre);

    // Estructura: clientes/ID_NOMBRE/folio_XXXX (si existe)
    let ruta = `clientes/${clienteId}_${nombreNormalizado}`;
    
    if (folioSolicitud) {
      const folioNormalizado = this.normalizarTexto(folioSolicitud);
      ruta += `/folio_${folioNormalizado}`;
    }
    
    return ruta;
  }

  /**
   * Genera el nombre del archivo con timestamp y tipo
   * @param tipoDocumento Tipo de documento (será normalizado)
   * @param originalName Nombre original del archivo
   * @param reemplazar Si debe reemplazar archivo existente
   * @returns Nombre del archivo normalizado
   */
  private generarNombreArchivo(tipoDocumento: string, originalName: string, reemplazar: boolean = false): string {
    const extension = path.extname(originalName);
    const tipoNormalizado = this.normalizarTexto(tipoDocumento);
    
    if (reemplazar) {
      // Si es reemplazo, usar nombre consistente sin timestamp
      return `${tipoNormalizado}${extension}`;
    } else {
      // Si es nuevo, agregar timestamp
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      return `${tipoNormalizado}_${timestamp}${extension}`;
    }
  }

  /**
   * Sube un archivo a Google Cloud Storage
   * @param file Archivo de multer
   * @param options Opciones de subida
   * @returns URL del archivo y metadata
   */
  async uploadDocumento(file: Express.Multer.File, options: UploadOptions) {
    try {
      const { clienteId, clienteNombre, folioSolicitud, tipoDocumento, reemplazar = false } = options;

      // Generar ruta de carpeta
      const carpeta = this.generarRutaCarpeta(clienteId, clienteNombre, folioSolicitud);
      
      // Generar nombre de archivo
      const nombreArchivo = this.generarNombreArchivo(tipoDocumento, file.originalname, reemplazar);
      
      // Ruta completa del archivo
      const rutaCompleta = `${carpeta}/${nombreArchivo}`;

      // Si es reemplazo, eliminar archivo anterior
      if (reemplazar) {
        await this.eliminarArchivosAnteriores(carpeta, tipoDocumento);
      }

      // Crear referencia al archivo
      const fileUpload = this.bucket.file(rutaCompleta);

      // Configurar metadatos
      const metadata = {
        contentType: file.mimetype,
        metadata: {
          clienteId: clienteId.toString(),
          tipoDocumento,
          folioSolicitud: folioSolicitud || '',
          uploadDate: new Date().toISOString(),
          originalName: file.originalname,
        },
      };

      // Subir archivo
      const stream = fileUpload.createWriteStream({
        metadata,
        resumable: false,
      });

      return new Promise<{url: string, rutaCompleta: string, metadata: any}>((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', async () => {
          // Generar URL firmada con alta disponibilidad
          const signedUrl = await this.generarUrlFirmada(rutaCompleta);
          
          resolve({
            url: signedUrl,
            rutaCompleta,
            metadata: metadata.metadata,
          });
        });
        stream.end(file.buffer);
      });

    } catch (error) {
      console.error('Error subiendo archivo:', error);
      throw new Error(`Error al subir documento: ${error}`);
    }
  }

  /**
   * Elimina archivos anteriores del mismo tipo de documento
   * @param carpeta Ruta de la carpeta
   * @param tipoDocumento Tipo de documento
   */
  private async eliminarArchivosAnteriores(carpeta: string, tipoDocumento: string) {
    try {
      const tipoSanitizado = tipoDocumento.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
      const [files] = await this.bucket.getFiles({
        prefix: `${carpeta}/${tipoSanitizado}`,
      });

      // Eliminar archivos existentes del mismo tipo
      await Promise.all(files.map((file: any) => file.delete().catch(() => {})));
    } catch (error) {
      console.warn('Error eliminando archivos anteriores:', error);
    }
  }

  /**
   * Genera una URL firmada con alta disponibilidad (7 días)
   * @param rutaArchivo Ruta del archivo en el bucket
   * @returns URL firmada
   */
  async generarUrlFirmada(rutaArchivo: string): Promise<string> {
    try {
      const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 días
      };

      const [signedUrl] = await this.bucket.file(rutaArchivo).getSignedUrl(options);
      return signedUrl;
    } catch (error) {
      console.error('Error generando URL firmada:', error);
      throw new Error('Error al generar URL de acceso al documento');
    }
  }

  /**
   * Regenera URL firmada para un documento existente
   * @param rutaArchivo Ruta del archivo
   * @returns Nueva URL firmada
   */
  async regenerarUrlFirmada(rutaArchivo: string): Promise<string> {
    return this.generarUrlFirmada(rutaArchivo);
  }

  /**
   * Verifica si un archivo existe en el storage
   * @param rutaArchivo Ruta del archivo
   * @returns Boolean indicando si existe
   */
  async archivoExiste(rutaArchivo: string): Promise<boolean> {
    try {
      const [exists] = await this.bucket.file(rutaArchivo).exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Crea la estructura de carpetas para un cliente
   * @param clienteId ID del cliente
   * @param clienteNombre Nombre del cliente
   * @param folioSolicitud Folio opcional
   */
  async crearCarpetaCliente(clienteId: number, clienteNombre: string, folioSolicitud?: string) {
    const carpeta = this.generarRutaCarpeta(clienteId, clienteNombre, folioSolicitud);
    
    // Crear archivo marcador para la carpeta
    const marcador = this.bucket.file(`${carpeta}/.gitkeep`);
    await marcador.save('', {
      metadata: {
        contentType: 'text/plain',
        metadata: {
          clienteId: clienteId.toString(),
          created: new Date().toISOString(),
        },
      },
    });

    return carpeta;
  }

  /**
   * Obtiene lista de archivos de un cliente
   * @param clienteId ID del cliente
   * @param clienteNombre Nombre del cliente
   * @param folioSolicitud Folio opcional
   */
  async listarArchivosCliente(clienteId: number, clienteNombre: string, folioSolicitud?: string) {
    const carpeta = this.generarRutaCarpeta(clienteId, clienteNombre, folioSolicitud);
    
    const [files] = await this.bucket.getFiles({
      prefix: carpeta,
    });

    return files.map((file: any) => ({
      nombre: file.name,
      metadata: file.metadata,
      fechaCreacion: file.metadata.timeCreated,
      tamano: file.metadata.size,
    }));
  }

  /**
   * Método público para testing - normalizar texto
   * @param texto Texto a normalizar
   * @returns Texto normalizado
   */
  public testNormalizarTexto(texto: string): string {
    return this.normalizarTexto(texto);
  }

  /**
   * Método público para testing - generar ruta de carpeta
   * @param options Opciones para generar la ruta
   * @returns Ruta de carpeta normalizada
   */
  public testGenerarRutaCarpeta(options: { clienteId: number; clienteNombre: string; folioSolicitud?: string }): string {
    return this.generarRutaCarpeta(options.clienteId, options.clienteNombre, options.folioSolicitud);
  }

  /**
   * Método público para testing - generar nombre de archivo
   * @param tipoDocumento Tipo de documento
   * @param nombreOriginal Nombre original del archivo
   * @param reemplazar Si se está reemplazando el archivo
   * @returns Nombre de archivo normalizado
   */
  public testGenerarNombreArchivo(tipoDocumento: string, nombreOriginal: string, reemplazar?: boolean): string {
    return this.generarNombreArchivo(tipoDocumento, nombreOriginal, reemplazar || false);
  }
}

export const storageService = new StorageService();
