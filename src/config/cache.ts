import Redis from 'redis';
import { env } from './env';
import { logError, logInfo, logDebug } from './logger';

// Configuración unificada de Redis
let redisClient: Redis.RedisClientType | null = null;

// TTLs estándar
export const TTL = {
  SHORT: 300,    // 5 minutos
  MEDIUM: 900,   // 15 minutos  
  LONG: 3600,    // 1 hora
  VERY_LONG: 86400, // 24 horas
} as const;

// Alias para compatibilidad
export const CacheTTL = TTL;

// Namespaces para organización
export const CACHE_NAMESPACES = {
  USER: 'user',
  DOCUMENT: 'doc',
  GEMINI: 'gemini',
  DASHBOARD: 'dash',
  METRICS: 'metrics',
  // Compatibilidad con código existente
  CLIENTE: 'cliente',
  DOCUMENTO: 'documento', 
  SOLICITUD: 'solicitud',
  USUARIO: 'usuario',
  COMPLETITUD: 'completitud',
  ESTADISTICAS: 'estadisticas'
} as const;

// Cache Keys para compatibilidad con código existente
export const CacheKeys = {
  CLIENTE: (id: number) => `cliente:${id}`,
  CLIENTES_TODOS: 'clientes:todos',
  CLIENTES_LIST: (filtros: string) => `clientes:list:${Buffer.from(filtros).toString('base64')}`,
  DOCUMENTOS_CLIENTE: (clienteId: number) => `documentos:cliente:${clienteId}`,
  DOCUMENTO_TIPOS: 'documentos:tipos',
  COMPLETITUD_CLIENTE: (clienteId: number) => `completitud:cliente:${clienteId}`,
  SOLICITUDES_CLIENTE: (clienteId: number) => `solicitudes:cliente:${clienteId}`,
  USUARIO: (id: number) => `usuario:${id}`,
  USUARIOS_TODOS: 'usuarios:todos',
  DASHBOARD_STATS: 'dashboard:stats'
};

async function initializeRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = Redis.createClient({ 
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 3000),
        connectTimeout: 10000,
      }
    });
    
    redisClient.on('error', (err) => {
      logError('Redis Client Error', err);
    });
    
    redisClient.on('connect', () => {
      logInfo('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      logInfo('Redis Client Ready');
    });

    redisClient.on('end', () => {
      logInfo('Redis Client Disconnected');
    });

    await redisClient.connect();
    
    // Test de conexión
    await redisClient.ping();
    logInfo('Redis connection established successfully');
    
  } catch (error) {
    logError('Failed to initialize Redis', error as Error);
    // En desarrollo, permitir continuar sin Redis
    if (env.NODE_ENV === 'development') {
      logInfo('Continuing without Redis in development mode');
    } else {
      throw error;
    }
  }
}

// Inicializar Redis al cargar el módulo
initializeRedis().catch(err => {
  logError('Critical: Failed to initialize Redis', err);
});

export class CacheService {
  private static hitCount = 0;
  private static missCount = 0;

  /**
   * Generar clave con namespace
   */
  private static generateKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Obtener valor del caché con métricas
   * Sobrecarga para compatibilidad: get(key) o get(namespace, key)
   */
  static async get(namespaceOrKey: string, key?: string): Promise<any> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        this.missCount++;
        logDebug('Redis not available for get operation', { namespaceOrKey, key });
        return null;
      }

      let fullKey: string;
      if (key === undefined) {
        // Llamada con un solo parámetro: get(key)
        fullKey = namespaceOrKey;
      } else {
        // Llamada con dos parámetros: get(namespace, key)
        fullKey = this.generateKey(namespaceOrKey, key);
      }

      const value = await redisClient.get(fullKey);
      
      if (value) {
        this.hitCount++;
        logDebug('Cache hit', { fullKey });
        return JSON.parse(value);
      } else {
        this.missCount++;
        logDebug('Cache miss', { fullKey });
        return null;
      }
    } catch (error) {
      this.missCount++;
      logError('Error getting from cache', error as Error, { namespaceOrKey, key });
      return null;
    }
  }

  /**
   * Establecer valor en caché con TTL
   * Sobrecarga para compatibilidad: set(key, value, ttl) o set(namespace, key, value, ttl)
   */
  static async set(namespaceOrKey: string, keyOrValue: string | any, valueOrTtl?: any, ttlSeconds: number = TTL.MEDIUM): Promise<boolean> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logDebug('Redis not available for set operation');
        return false;
      }

      let fullKey: string;
      let value: any;
      let ttl: number;

      if (valueOrTtl === undefined) {
        // Llamada con dos parámetros: set(key, value)
        fullKey = namespaceOrKey;
        value = keyOrValue;
        ttl = TTL.MEDIUM;
      } else if (typeof valueOrTtl === 'number') {
        // Llamada con tres parámetros: set(key, value, ttl)
        fullKey = namespaceOrKey;
        value = keyOrValue;
        ttl = valueOrTtl;
      } else {
        // Llamada con cuatro parámetros: set(namespace, key, value, ttl)
        fullKey = this.generateKey(namespaceOrKey, keyOrValue as string);
        value = valueOrTtl;
        ttl = ttlSeconds;
      }

      const serializedValue = JSON.stringify(value);
      
      await redisClient.setEx(fullKey, ttl, serializedValue);
      logDebug('Cache set', { fullKey, ttl });
      return true;
    } catch (error) {
      logError('Error setting cache', error as Error);
      return false;
    }
  }

  /**
   * Eliminar clave específica
   */
  static async delete(namespace: string, key: string): Promise<boolean> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return false;
      }

      const fullKey = this.generateKey(namespace, key);
      const result = await redisClient.del(fullKey);
      logDebug('Cache delete', { namespace, key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logError('Error deleting from cache', error as Error, { namespace, key });
      return false;
    }
  }

  /**
   * Limpiar todo un namespace
   */
  static async clearNamespace(namespace: string): Promise<number> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return 0;
      }

      const pattern = `${namespace}:*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const result = await redisClient.del(keys);
      logInfo('Cache namespace cleared', { namespace, keysDeleted: result });
      return result;
    } catch (error) {
      logError('Error clearing namespace', error as Error, { namespace });
      return 0;
    }
  }

  /**
   * Obtener estadísticas del caché
   */
  static getStats(): any {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total * 100).toFixed(2) : '0.00';
    
    return {
      type: 'redis',
      connected: redisClient?.isOpen || false,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: `${hitRate}%`,
      total
    };
  }

  /**
   * Inicializar el sistema de caché (compatibilidad)
   */
  static async init(): Promise<void> {
    await initializeRedis();
  }

  /**
   * Verificar si Redis está disponible (compatibilidad)
   */
  static isRedisAvailable(): boolean {
    return redisClient?.isOpen || false;
  }

  /**
   * Eliminar una clave específica (compatibilidad)
   */
  static async del(key: string): Promise<boolean> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logDebug('Redis not available for delete operation', { key });
        return false;
      }

      const result = await redisClient.del(key);
      logDebug('Cache key deleted', { key, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logError('Error deleting from cache', error as Error, { key });
      return false;
    }
  }

  /**
   * Eliminar claves por patrón (compatibilidad)
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        logDebug('Redis not available for pattern delete operation', { pattern });
        return 0;
      }

      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const result = await redisClient.del(keys);
      logDebug('Cache keys deleted by pattern', { pattern, deleted: result });
      return result;
    } catch (error) {
      logError('Error deleting pattern from cache', error as Error, { pattern });
      return 0;
    }
  }

  /**
   * Método get con un solo parámetro (compatibilidad)
   */
  static async getSingle(key: string): Promise<any> {
    return this.get(CACHE_NAMESPACES.USER, key);
  }

  /**
   * Reset de métricas
   */
  static resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Verificar conexión de Redis
   */
  static async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      if (!redisClient || !redisClient.isOpen) {
        return { healthy: false, error: 'Redis client not connected' };
      }

      const start = Date.now();
      await redisClient.ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return { healthy: false, error: (error as Error).message };
    }
  }

  /**
   * Cerrar conexión (para testing y shutdown)
   */
  static async disconnect(): Promise<void> {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
      logInfo('Redis client disconnected');
    }
  }
}
