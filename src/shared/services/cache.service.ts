import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  
  // TTL padrões
  private readonly DEFAULT_TTL = 300; // 5 minutos
  private readonly SESSION_AVAILABILITY_TTL = 10; // 10 segundos (dados em tempo real)
  
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * Armazena dados no cache
   */
  async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, error);
    }
  }

  /**
   * Recupera dados do cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        this.logger.debug(`Cache miss: ${key}`);
        return null;
      }
      
      this.logger.debug(`Cache hit: ${key}`);
      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, error);
      return null;
    }
  }

  /**
   * Deleta uma chave do cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, error);
    }
  }

  /**
   * Deleta múltiplas chaves com um padrão
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Cache delete pattern error for ${pattern}`, error);
    }
  }

  /**
   * Incrementa um contador atômico
   */
  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const value = await this.redis.incr(key);
      
      if (ttl && value === 1) {
        await this.redis.expire(key, ttl);
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Cache increment error for key ${key}`, error);
      throw error;
    }
  }

  /**
   * Armazena disponibilidade de sessão com TTL curto
   */
  async cacheSessionAvailability(sessionId: string, data: any): Promise<void> {
    const key = `session:${sessionId}:availability`;
    await this.set(key, data, this.SESSION_AVAILABILITY_TTL);
  }

  /**
   * Recupera disponibilidade de sessão do cache
   */
  async getSessionAvailability(sessionId: string): Promise<any> {
    const key = `session:${sessionId}:availability`;
    return this.get(key);
  }

  /**
   * Invalida cache de disponibilidade após mudança
   */
  async invalidateSessionCache(sessionId: string): Promise<void> {
    const key = `session:${sessionId}:availability`;
    await this.delete(key);
  }
}