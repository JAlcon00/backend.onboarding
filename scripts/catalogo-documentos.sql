-- Script para verificar y actualizar el catálogo de tipos de documento
-- Basado en la estructura existente de la base de datos

-- Verificar la estructura actual
DESCRIBE documento_tipo;

-- Verificar los datos actuales
SELECT 
    documento_tipo_id,
    nombre,
    CASE 
        WHEN aplica_pf = 1 THEN 'PF'
        WHEN aplica_pfae = 1 THEN 'PF_AE' 
        WHEN aplica_pm = 1 THEN 'PM'
        ELSE 'N/A'
    END as tipo_persona,
    CASE 
        WHEN vigencia_dias IS NULL THEN 'Una vez (no caduca)'
        WHEN vigencia_dias = 30 THEN '30 días'
        WHEN vigencia_dias = 90 THEN '3 meses'
        WHEN vigencia_dias = 365 THEN '1 año'
        WHEN vigencia_dias = 730 THEN '2 años'
        ELSE CONCAT(vigencia_dias, ' días')
    END as vigencia,
    CASE WHEN opcional = 1 THEN 'Sí' ELSE 'No' END as opcional
FROM documento_tipo 
ORDER BY aplica_pm, nombre;

-- ============================================================================
-- INSERCIÓN DE DATOS: CATÁLOGO DE TIPOS DE DOCUMENTO
-- ============================================================================

-- Limpiar tabla antes de insertar (opcional, comentar si no se desea)
-- DELETE FROM documento_tipo;

-- Insertar documentos para Persona Física (PF, PF_AE)
-- Formato: (nombre, aplica_pf, aplica_pfae, aplica_pm, vigencia_dias, opcional)
INSERT INTO documento_tipo (nombre, aplica_pf, aplica_pfae, aplica_pm, vigencia_dias, opcional) VALUES
/* ---------- PERSONA FÍSICA (PF, PF_AE) ---------- */
('INE',                              1, 1, 0, 365,  0),
('CURP',                             1, 1, 1, NULL, 0),
('Constancia Situación Fiscal',      1, 1, 1, 30,   0),
('Comprobante / Acuse eFirma',       1, 1, 1, NULL, 0),
('Comprobante de Ingresos',          1, 1, 0, NULL, 0),
('Información Financiera',           1, 1, 1, NULL, 0),
('Pasivos Bancarios',                1, 1, 1, NULL, 0),
('Carátula Estado de Cuenta',        1, 1, 1, NULL, 0),
('Referencias',                      1, 1, 1, NULL, 0),
('Declaración de Impuestos (2 últimas)', 1, 1, 1, NULL, 0),
('Relación de Bienes',               1, 1, 0, 90,   0),
('Acta de Matrimonio',               1, 1, 0, NULL, 1)
ON DUPLICATE KEY UPDATE 
    aplica_pf = VALUES(aplica_pf),
    aplica_pfae = VALUES(aplica_pfae),
    aplica_pm = VALUES(aplica_pm),
    vigencia_dias = VALUES(vigencia_dias),
    opcional = VALUES(opcional);

-- ============================================================================
-- VERIFICACIONES POST-INSERCIÓN
-- ============================================================================

-- Obtener estadísticas del catálogo actualizado
SELECT 
    'Total documentos' as tipo,
    COUNT(*) as cantidad
FROM documento_tipo
UNION ALL
SELECT 
    'Para Persona Física',
    COUNT(*) 
FROM documento_tipo 
WHERE aplica_pf = 1
UNION ALL
SELECT 
    'Para PF con Act. Empresarial',
    COUNT(*) 
FROM documento_tipo 
WHERE aplica_pfae = 1
UNION ALL
SELECT 
    'Para Persona Moral',
    COUNT(*) 
FROM documento_tipo 
WHERE aplica_pm = 1
UNION ALL
SELECT 
    'Documentos opcionales',
    COUNT(*) 
FROM documento_tipo 
WHERE opcional = 1;

-- Verificar documentos que pueden necesitar renovación por solicitud
-- (basado en lógica de negocio)
SELECT 
    documento_tipo_id,
    nombre,
    'Requiere renovación por solicitud' as nota
FROM documento_tipo 
WHERE nombre IN (
    'Comprobante de Ingresos',
    'Pasivos Bancarios',
    'Carátula Estado de Cuenta',
    'Declaración de Impuestos (2 últimas)',
    'Carátula Estado de Cuenta (PM)',
    'Pasivos Bancarios (PM)'
)
ORDER BY nombre;

-- Verificar documentos específicos para PF
SELECT 
    documento_tipo_id,
    nombre,
    CASE 
        WHEN vigencia_dias IS NULL THEN 'Una vez (no caduca)'
        WHEN vigencia_dias = 30 THEN '30 días'
        WHEN vigencia_dias = 90 THEN '3 meses'
        WHEN vigencia_dias = 365 THEN '1 año'
        WHEN vigencia_dias = 730 THEN '2 años'
        ELSE CONCAT(vigencia_dias, ' días')
    END as vigencia,
    CASE WHEN opcional = 1 THEN 'Opcional' ELSE 'Obligatorio' END as requerimiento
FROM documento_tipo 
WHERE aplica_pf = 1
ORDER BY opcional, nombre;
