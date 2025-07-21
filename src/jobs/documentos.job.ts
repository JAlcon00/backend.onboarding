import { DocumentoService } from '../modules/documento/documento.service';
import { logInfo, logError } from '../config/logger';
import cron from 'node-cron';

/**
 * Job para actualizar automáticamente el estatus de documentos vencidos
 * Se ejecuta todos los días a las 6:00 AM
 */
export const documentosVencidosJob = () => {
  cron.schedule('0 6 * * *', async () => {
    logInfo('Iniciando job de actualización de documentos vencidos');
    
    try {
      const documentosVencidos = await DocumentoService.getDocumentosVencidos();
      
      // Actualizar documentos vencidos
      let documentosActualizados = 0;
      for (const documento of documentosVencidos) {
        await DocumentoService.updateEstatusDocumento(documento.documento_id, 'vencido');
        documentosActualizados++;
      }
      
      logInfo('Job de documentos vencidos completado', { documentosActualizados });
      
    } catch (error) {
      logError('Error en job de documentos vencidos', error as Error);
    }
  });
};

/**
 * Job para regenerar URLs firmadas que estén próximas a expirar
 * Se ejecuta todos los días a las 2:00 AM
 */
export const regenerarUrlsJob = () => {
  cron.schedule('0 2 * * *', async () => {
    logInfo('Iniciando job de regeneración de URLs firmadas');
    
    try {
      // Aquí podrías implementar la lógica para regenerar URLs
      // que estén próximas a expirar (por ejemplo, URLs con menos de 24 horas)
      
      logInfo('Job de regeneración de URLs completado');
      
    } catch (error) {
      logError('Error en job de regeneración de URLs', error as Error);
    }
  });
};

/**
 * Inicializa todos los jobs relacionados con documentos
 */
export const inicializarJobsDocumentos = () => {
  logInfo('Inicializando jobs de documentos');
  
  documentosVencidosJob();
  regenerarUrlsJob();
  
  logInfo('Jobs de documentos inicializados correctamente');
};
