-- Migración para crear tabla de auditoría
-- Ejecutar en base de datos MySQL

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NULL COMMENT 'ID del usuario que realizó la acción',
  `userEmail` VARCHAR(255) NULL COMMENT 'Email del usuario para trazabilidad',
  `action` VARCHAR(100) NOT NULL COMMENT 'Acción realizada (CREATE, UPDATE, DELETE, LOGIN, etc.)',
  `entity` VARCHAR(100) NOT NULL COMMENT 'Entidad afectada (Usuario, Documento, Cliente, etc.)',
  `entityId` VARCHAR(100) NULL COMMENT 'ID de la entidad afectada',
  `beforeData` JSON NULL COMMENT 'Estado anterior de la entidad (para UPDATE/DELETE)',
  `afterData` JSON NULL COMMENT 'Estado posterior de la entidad (para CREATE/UPDATE)',
  `ipAddress` VARCHAR(45) NULL COMMENT 'Dirección IP del cliente',
  `userAgent` TEXT NULL COMMENT 'User Agent del navegador/cliente',
  `requestId` VARCHAR(36) NULL COMMENT 'ID de correlación del request',
  `sessionId` VARCHAR(255) NULL COMMENT 'ID de sesión del usuario',
  `success` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Indica si la acción fue exitosa',
  `errorMessage` TEXT NULL COMMENT 'Mensaje de error en caso de fallo',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp de la acción',
  `additionalMetadata` JSON NULL COMMENT 'Metadatos adicionales específicos del contexto',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Índices para optimizar consultas
  INDEX `idx_userId` (`userId`),
  INDEX `idx_action` (`action`),
  INDEX `idx_entity` (`entity`),
  INDEX `idx_entityId` (`entityId`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_requestId` (`requestId`),
  INDEX `idx_ipAddress` (`ipAddress`),
  INDEX `idx_success` (`success`),
  
  -- Índices compuestos para búsquedas frecuentes
  INDEX `idx_entity_entityId_timestamp` (`entity`, `entityId`, `timestamp`),
  INDEX `idx_userId_action_timestamp` (`userId`, `action`, `timestamp`),
  INDEX `idx_timestamp_action` (`timestamp`, `action`),
  
  -- Configuración de tabla
  ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
) COMMENT='Tabla de auditoría para compliance y KYC';

-- Crear usuario de solo lectura para auditores (opcional)
-- CREATE USER 'auditor'@'%' IDENTIFIED BY 'secure_password';
-- GRANT SELECT ON onboarding.audit_log TO 'auditor'@'%';
-- FLUSH PRIVILEGES;
