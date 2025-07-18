import { documentoService } from '../services/documento.service';
import cron from 'node-cron';

/**
 * Job para actualizar automáticamente el estatus de documentos vencidos
 * Se ejecuta todos los días a las 6:00 AM
 */
export const documentosVencidosJob = () => {
  cron.schedule('0 6 * * *', async () => {
    console.log('🔄 Iniciando job de actualización de documentos vencidos...');
    
    try {
      const documentosActualizados = await documentoService.actualizarDocumentosVencidos();
      console.log(`✅ Job completado: ${documentosActualizados} documentos marcados como vencidos`);
      
      // Obtener documentos próximos a vencer
      const proximosAVencer = await documentoService.getDocumentosProximosAVencer(30);
      if (proximosAVencer.length > 0) {
        console.log(`⚠️  ${proximosAVencer.length} documentos próximos a vencer en los próximos 30 días`);
        
        // Aquí podrías enviar notificaciones por email
        // await notificationService.enviarAlertasVencimiento(proximosAVencer);
      }
      
    } catch (error) {
      console.error('❌ Error en job de documentos vencidos:', error);
    }
  });
};

/**
 * Job para regenerar URLs firmadas que estén próximas a expirar
 * Se ejecuta todos los días a las 2:00 AM
 */
export const regenerarUrlsJob = () => {
  cron.schedule('0 2 * * *', async () => {
    console.log('🔄 Iniciando job de regeneración de URLs firmadas...');
    
    try {
      // Aquí podrías implementar la lógica para regenerar URLs
      // que estén próximas a expirar (por ejemplo, URLs con menos de 24 horas)
      
      console.log('✅ Job de regeneración de URLs completado');
      
    } catch (error) {
      console.error('❌ Error en job de regeneración de URLs:', error);
    }
  });
};

/**
 * Inicializa todos los jobs relacionados con documentos
 */
export const inicializarJobsDocumentos = () => {
  console.log('🚀 Inicializando jobs de documentos...');
  
  documentosVencidosJob();
  regenerarUrlsJob();
  
  console.log('✅ Jobs de documentos inicializados correctamente');
};
