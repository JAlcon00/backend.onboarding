-- Script para insertar tipos de documento básicos para testing
-- Solo inserta si no existen (para evitar duplicados)

-- Insertar tipos de documento para Persona Física (PF)
INSERT IGNORE INTO documento_tipo (documento_tipo_id, nombre, aplica_pf, aplica_pfae, aplica_pm, vigencia_dias, opcional) VALUES
(1, 'INE', 1, 1, 0, NULL, 0),
(2, 'CURP', 1, 1, 0, NULL, 0),
(3, 'Constancia de Situación Fiscal', 1, 1, 1, 90, 0),
(4, 'eFirma (FIEL)', 1, 1, 1, NULL, 0),
(5, 'Comprobante de Ingresos', 1, 1, 1, 30, 0),
(6, 'Estado de Cuenta Bancario', 1, 1, 1, 30, 0),
(7, 'Acta de Nacimiento', 1, 1, 0, NULL, 1),
(8, 'Comprobante de Domicilio', 1, 1, 1, 90, 0);

-- Verificar que se insertaron correctamente
SELECT 
    documento_tipo_id,
    nombre,
    CASE WHEN aplica_pf = 1 THEN 'PF' ELSE '' END as pf,
    CASE WHEN aplica_pfae = 1 THEN 'PF_AE' ELSE '' END as pf_ae,
    CASE WHEN aplica_pm = 1 THEN 'PM' ELSE '' END as pm,
    CASE 
        WHEN vigencia_dias IS NULL THEN 'No caduca'
        ELSE CONCAT(vigencia_dias, ' días')
    END as vigencia,
    CASE WHEN opcional = 1 THEN 'Opcional' ELSE 'Obligatorio' END as tipo
FROM documento_tipo 
WHERE documento_tipo_id IN (1,2,3,4,5,6,7,8)
ORDER BY documento_tipo_id;
