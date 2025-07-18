-- Verificar estructura y datos de documento_tipo
DESCRIBE documento_tipo;

-- Ver todos los tipos de documento existentes
SELECT 
    documento_tipo_id,
    nombre,
    aplica_pf,
    aplica_pfae,
    aplica_pm,
    vigencia_dias,
    opcional
FROM documento_tipo 
ORDER BY documento_tipo_id;

-- Ver específicamente los que aplican a PF
SELECT 
    documento_tipo_id,
    nombre,
    aplica_pf,
    vigencia_dias,
    opcional
FROM documento_tipo 
WHERE aplica_pf = 1
ORDER BY documento_tipo_id;

-- Contar tipos por categoría
SELECT 
    'Total documentos' as categoria,
    COUNT(*) as cantidad
FROM documento_tipo
UNION ALL
SELECT 
    'Para PF',
    COUNT(*) 
FROM documento_tipo 
WHERE aplica_pf = 1
UNION ALL
SELECT 
    'Para PF_AE',
    COUNT(*) 
FROM documento_tipo 
WHERE aplica_pfae = 1
UNION ALL
SELECT 
    'Para PM',
    COUNT(*) 
FROM documento_tipo 
WHERE aplica_pm = 1;
