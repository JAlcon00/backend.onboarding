import Redis from 'redis';
import NodeCache from 'node-cache';
import { env } from './env';
import { logError, logInfo, logDebug } from './logger';

// Para desarrollo local - usar node-cache
const memoryCache = new NodeCache({ 
  stdTTL: 600, // 10 minutos por defecto
  checkperiod: 120, // Verificar cada 2 minutos
  useClones: false // Para mejor rendimiento
});

// Para producción - usar Redis
let redisClient: Redis.RedisClientType | null = null;

if (env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  redisClient = Redis.createClient({ 
    url: process.env.REDIS_URL
  });
  
  redisClient.on('error', (err) => {
    logError('Redis Client Error', err);
  });
  
  redisClient.on('connect', () => {
    logInfo('Redis Client Connected');
  });
}

export class CacheService {
  /**
   * Obtener valor del caché
   */
  static async get(key: string): Promise<any> {
    try {
      if (redisClient && redisClient.isOpen) {
        const value = await redisClient.get(key);
        return value ? JSON.parse(value) : null;
      }
      
      return memoryCache.get(key) || null;
    } catch (error) {
      logError('Error getting cache', error as Error, { key });
      return null;
    }
  }
  
  /**
   * Establecer valor en caché
   */
  static async set(key: string, value: any, ttl: number = 600): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        memoryCache.set(key, value, ttl);
      }
    } catch (error) {
      logError('Error setting cache', error as Error, { key, ttl });
    }
  }
  
  /**
   * Eliminar valor del caché
   */
  static async del(key: string): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        await redisClient.del(key);
      } else {
        memoryCache.del(key);
      }
    } catch (error) {
      logError('Error deleting cache', error as Error, { key });
    }
  }
  
  /**
   * Eliminar múltiples claves que coincidan con un patrón
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      if (redisClient && redisClient.isOpen) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } else {
        // Para node-cache, obtener todas las claves y filtrar
        const keys = memoryCache.keys();
        const matchingKeys = keys.filter(key => key.includes(pattern.replace('*', '')));
        matchingKeys.forEach(key => memoryCache.del(key));
      }
    } catch (error) {
      logError('Error deleting cache pattern', error as Error, { pattern });
    }
  }
  
  /**
   * Verificar si una clave existe en caché
   */
  static async exists(key: string): Promise<boolean> {
    try {
      if (redisClient && redisClient.isOpen) {
        return (await redisClient.exists(key)) === 1;
      }
      
      return memoryCache.has(key);
    } catch (error) {
      logError('Error checking cache existence', error as Error, { key });
      return false;
    }
  }
  
  /**
   * Obtener estadísticas del caché
   */
  static getStats(): any {
    if (redisClient && redisClient.isOpen) {
      return { type: 'redis', connected: redisClient.isOpen };
    }
    
    return {
      type: 'memory',
      stats: memoryCache.getStats()
    };
  }
  
  /**
   * Inicializar conexión Redis si está disponible
   */
  static async init(): Promise<void> {
    if (redisClient && !redisClient.isOpen) {
      try {
        await redisClient.connect();
        logInfo('Redis conectado exitosamente');
      } catch (error) {
        logError('Error conectando a Redis', error as Error);
        logInfo('Usando caché en memoria como fallback');
      }
    }
  }
  
  /**
   * Cerrar conexión Redis
   */
  static async close(): Promise<void> {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
    }
  }
  
  /**
   * Verificar si Redis está disponible
   */
  static isRedisAvailable(): boolean {
    return redisClient !== null && redisClient.isOpen;
  }
}

// Claves de caché predefinidas
export const CacheKeys = {
  DOCUMENTO_TIPOS: 'documento_tipos',
  USUARIO: (id: number) => `usuario:${id}`,
  CLIENTE: (id: number) => `cliente:${id}`,
  CLIENTES_LIST: (filters: string) => `clientes:list:${filters}`,
  DOCUMENTOS_CLIENTE: (clienteId: number) => `documentos:cliente:${clienteId}`,
  SOLICITUDES_CLIENTE: (clienteId: number) => `solicitudes:cliente:${clienteId}`,
  DASHBOARD_STATS: 'dashboard:stats',
  COMPLETITUD_CLIENTE: (clienteId: number) => `completitud:cliente:${clienteId}`,
} as const;

// TTL predefinidos (en segundos)
export const CacheTTL = {
  SHORT: 300,    // 5 minutos
  MEDIUM: 900,   // 15 minutos
  LONG: 3600,    // 1 hora
  DAILY: 86400,  // 24 horas
} as const;
