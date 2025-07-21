import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { sequelize } from '../config/database';
import { CacheService } from '../config/cache';
import { logInfo, logError } from '../config/logger';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  responseTime?: number;
  details?: any;
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: HealthCheckResult[];
}

export class HealthController {
  // Health check completo
  public static healthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];
    
    try {
      // Verificar base de datos
      const dbResult = await HealthController.checkDatabase();
      results.push(dbResult);
      
      // Verificar caché
      const cacheResult = await HealthController.checkCache();
      results.push(cacheResult);
      
      // Verificar memoria
      const memoryResult = HealthController.checkMemory();
      results.push(memoryResult);
      
      // Determinar estado general
      const hasUnhealthy = results.some(r => r.status === 'unhealthy');
      const hasDegraded = results.some(r => r.status === 'degraded');
      
      const overallStatus = hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy';
      
      const response: HealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        services: results
      };
      
      const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
      
      logInfo('Health check realizado', {
        status: overallStatus,
        duration: `${Date.now() - startTime}ms`,
        services: results.map(r => ({ service: r.service, status: r.status }))
      });
      
      res.status(statusCode).json(response);
    } catch (error) {
      logError('Error en health check', error instanceof Error ? error : new Error(String(error)));
      
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        services: [],
        error: 'Health check falló'
      });
    }
  });
  
  // Health check simple (para load balancers)
  public static simpleHealthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Forzar garbage collection (solo desarrollo)
  public static forceGarbageCollection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
      res.status(403).json({
        success: false,
        message: 'No disponible en producción'
      });
      return;
    }
    
    const beforeMemory = process.memoryUsage();
    
    if (global.gc && typeof global.gc === 'function') {
      global.gc();
      const afterMemory = process.memoryUsage();
      
      const freed = beforeMemory.heapUsed - afterMemory.heapUsed;
      
      logInfo('Garbage collection ejecutado manualmente', {
        freedMemory: `${Math.round(freed / 1024 / 1024)}MB`,
        beforeHeap: `${Math.round(beforeMemory.heapUsed / 1024 / 1024)}MB`,
        afterHeap: `${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`
      });
      
      res.json({
        success: true,
        message: 'Garbage collection ejecutado',
        data: {
          freedMemory: `${Math.round(freed / 1024 / 1024)}MB`,
          before: {
            heapUsed: `${Math.round(beforeMemory.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(beforeMemory.heapTotal / 1024 / 1024)}MB`
          },
          after: {
            heapUsed: `${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(afterMemory.heapTotal / 1024 / 1024)}MB`
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Garbage collection no está habilitado. Ejecute con --expose-gc'
      });
    }
  });
  
  // Verificar base de datos
  private static async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      await sequelize.authenticate();
      const responseTime = Date.now() - startTime;
      
      return {
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        message: 'Conexión a base de datos exitosa',
        responseTime,
        details: {
          dialect: sequelize.getDialect(),
          pool: {
            max: sequelize.config.pool?.max || 0,
            min: sequelize.config.pool?.min || 0,
            acquire: sequelize.config.pool?.acquire || 0,
            idle: sequelize.config.pool?.idle || 0
          }
        }
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        message: 'Error en conexión a base de datos',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      };
    }
  }
  
  // Verificar caché
  private static async checkCache(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const testKey = 'health_check_test';
    const testValue = 'test_value';
    
    try {
      // Intentar escribir y leer del caché
      await CacheService.set(testKey, testValue, 60);
      const cachedValue = await CacheService.get(testKey);
      await CacheService.del(testKey);
      
      const responseTime = Date.now() - startTime;
      const isWorking = cachedValue === testValue;
      
      return {
        service: 'cache',
        status: isWorking ? (responseTime < 100 ? 'healthy' : 'degraded') : 'unhealthy',
        message: isWorking ? 'Caché funcionando correctamente' : 'Caché no responde correctamente',
        responseTime,
        details: {
          type: CacheService.isRedisAvailable() ? 'redis' : 'memory',
          test_success: isWorking
        }
      };
    } catch (error) {
      return {
        service: 'cache',
        status: 'unhealthy',
        message: 'Error en caché',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      };
    }
  }
  
  // Verificar memoria
  private static checkMemory(): HealthCheckResult {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const memoryUsagePercentage = (usedMemory / totalMemory) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Memoria en niveles normales';
    
    // Ajustar umbrales para desarrollo con ts-node
    const isProduction = process.env.NODE_ENV === 'production';
    const criticalThreshold = isProduction ? 90 : 98; // Más permisivo en desarrollo
    const warningThreshold = isProduction ? 80 : 95;
    
    if (memoryUsagePercentage > criticalThreshold) {
      status = 'unhealthy';
      message = `Uso de memoria crítico (${isProduction ? 'producción' : 'desarrollo'})`;
    } else if (memoryUsagePercentage > warningThreshold) {
      status = 'degraded';
      message = `Uso de memoria alto (${isProduction ? 'producción' : 'desarrollo'})`;
    }
    
    return {
      service: 'memory',
      status,
      message,
      details: {
        heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
        heapFree: `${Math.round(freeMemory / 1024 / 1024)}MB`,
        usagePercentage: `${memoryUsagePercentage.toFixed(2)}%`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        environment: process.env.NODE_ENV || 'development',
        thresholds: {
          warning: `${warningThreshold}%`,
          critical: `${criticalThreshold}%`
        }
      }
    };
  }
}
