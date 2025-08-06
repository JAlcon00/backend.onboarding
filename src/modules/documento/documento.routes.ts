import { Router, Request, Response } from 'express';
import { DocumentoController } from './documento.controller';
import { upload, uploadDocumento } from '../../config/multer';
import { authenticateToken, authorizeRoles } from '../../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// ==================== RUTAS ADMINISTRATIVAS NUEVAS ====================

// Estadísticas y análisis (solo ADMIN+)
router.get('/estadisticas', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), DocumentoController.getEstadisticasGenerales);
router.get('/estadisticas/tipos', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), DocumentoController.getEstadisticasPorTipo);
router.get('/analisis/completitud', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), DocumentoController.getAnalisisCompletitud);
router.get('/metricas/equipo', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.getMetricasEquipo);

// Gestión de tipos de documento (solo ADMIN+)
router.post('/tipos', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.createTipoDocumento);
router.put('/tipos/:id', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.updateTipoDocumento);
router.delete('/tipos/:id', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.deleteTipoDocumento);

// Operaciones masivas (solo ADMIN+)
router.patch('/lote/revisar', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.revisarLoteDocumentos);
router.get('/exportar', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), DocumentoController.exportarDatos);

// Rutas especiales (deben ir antes de las rutas con parámetros)
router.get('/tipos', DocumentoController.getTiposDocumento);
router.get('/vencidos', authorizeRoles('ADMIN', 'SUPER', 'AUDITOR'), DocumentoController.getDocumentosVencidos);

// Ruta para subir archivo de documento
router.post('/upload', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), upload, (req: Request, res: Response): void => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || (!files['document'] && !files['image'])) {
      res.status(400).json({
        success: false,
        message: 'No se subió ningún archivo',
      });
      return;
    }

    const file = files['document']?.[0] || files['image']?.[0];
    
    // Aquí puedes procesar el archivo (guardar en cloud storage, etc.)
    // Por ahora solo retornamos la información del archivo
    
    res.json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        // url: 'URL donde se guardó el archivo' // Implementar según tu servicio de storage
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar el archivo',
    });
  }
});

// Rutas para documentos
router.post('/', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), DocumentoController.createDocumento);
router.get('/', DocumentoController.getDocumentos);
router.get('/:id', DocumentoController.getDocumentoById);
router.put('/:id', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), DocumentoController.updateDocumento);
router.patch('/:id/review', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.reviewDocumento);
router.delete('/:id', authorizeRoles('ADMIN', 'SUPER'), DocumentoController.deleteDocumento);

// Rutas del servicio de documentos (nuevas)
router.post('/subir', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR'), uploadDocumento, DocumentoController.subirDocumento);
router.get('/cliente/:clienteId/faltantes', DocumentoController.getDocumentosFaltantes);
router.get('/cliente/:clienteId/completitud', DocumentoController.verificarCompletitud);
router.get('/cliente/:clienteId/coherencia', authorizeRoles('ADMIN', 'SUPER', 'OPERADOR', 'AUDITOR'), DocumentoController.analizarCoherenciaCliente);
router.post('/:documentoId/regenerar-url', DocumentoController.regenerarUrlDocumento);

export default router;
