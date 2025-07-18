-- Script para crear la base de datos de test
-- Ejecutar este script en MySQL antes de correr los tests

CREATE DATABASE IF NOT EXISTS `ONBOARDINGBYOLSON_TEST` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- Verificar que se creó correctamente
USE `ONBOARDINGBYOLSON_TEST`;
SELECT DATABASE() as 'Base de datos de test creada';

-- El usuario API2 ya debería tener permisos, pero por si acaso:
-- GRANT ALL PRIVILEGES ON `ONBOARDINGBYOLSON_TEST`.* TO 'API2'@'%';
-- FLUSH PRIVILEGES;
