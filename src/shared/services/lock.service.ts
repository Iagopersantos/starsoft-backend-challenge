import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redlock from 'redlock';

@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly redlock: Redlock;
  
  // Configurações de lock
  private readonly LOCK_TTL = 5000; // 5 segundos
  private readonly RETRY_COUNT = 10;
  private readonly RETRY_DELAY = 200; // ms
  
  constructor(@InjectRedis() private readonly redis: Redis) {
    this.redlock = new Redlock([redis], {
      driftFactor: 0.01,
      retryCount: this.RETRY_COUNT,
      retryDelay: this.RETRY_DELAY,
      retryJitter: 50
    });

    this.redlock.on('clientError', (err) => {
      this.logger.error('Redlock client error', err);
    });
  }

  /**
   * Adquire um lock distribuído para um recurso específico
   * @param resource - Nome do recurso (ex: 'seat:uuid')
   * @param ttl - Time to live do lock em ms (default: 5000)
   */
  async acquireLock(resource: string, ttl: number = this.LOCK_TTL) {
    try {
      const lock = await this.redlock.acquire([`lock:${resource}`], ttl);
      this.logger.debug(`Lock acquired for resource: ${resource}`);
      return lock;
    } catch (error) {
      this.logger.error(`Failed to acquire lock for ${resource}`, error);
      throw new Error(`Unable to acquire lock for ${resource}`);
    }
  }

  /**
   * Adquire múltiplos locks de forma ordenada para prevenir deadlocks
   * @param resources - Array de recursos para fazer lock
   * @param ttl - Time to live do lock em ms
   */
  async acquireMultipleLocks(resources: string[], ttl: number = this.LOCK_TTL) {
    // CRITICAL: Ordenar recursos para prevenir deadlocks
    const sortedResources = [...resources].sort();
    const lockKeys = sortedResources.map(r => `lock:${r}`);
    
    try {
      const lock = await this.redlock.acquire(lockKeys, ttl);
      this.logger.debug(`Multiple locks acquired for: ${sortedResources.join(', ')}`);
      return lock;
    } catch (error) {
      this.logger.error(`Failed to acquire multiple locks`, error);
      throw new Error('Unable to acquire all required locks');
    }
  }

  /**
   * Libera um lock
   */
  async releaseLock(lock: any) {
    try {
      await lock.release();
      this.logger.debug('Lock released successfully');
    } catch (error) {
      this.logger.error('Failed to release lock', error);
    }
  }

  /**
   * Executa uma função com lock automático
   */
  async withLock<T>(
    resource: string,
    callback: () => Promise<T>,
    ttl: number = this.LOCK_TTL
  ): Promise<T> {
    const lock = await this.acquireLock(resource, ttl);
    
    try {
      return await callback();
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Executa uma função com múltiplos locks
   */
  async withMultipleLocks<T>(
    resources: string[],
    callback: () => Promise<T>,
    ttl: number = this.LOCK_TTL
  ): Promise<T> {
    const lock = await this.acquireMultipleLocks(resources, ttl);
    
    try {
      return await callback();
    } finally {
      await this.releaseLock(lock);
    }
  }
}