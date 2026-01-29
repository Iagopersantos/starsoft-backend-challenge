import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../src/shared/services/cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockRedis: any;

  beforeEach(async () => {
    mockRedis = {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheService,
          useFactory: () => new CacheService(mockRedis),
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should store data with default TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await service.set(key, value);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        300,
        JSON.stringify(value),
      );
    });

    it('should store data with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const customTtl = 600;

      await service.set(key, value, customTtl);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        customTtl,
        JSON.stringify(value),
      );
    });

    it('should handle complex objects', async () => {
      const key = 'complex-key';
      const value = {
        nested: { deep: { value: 123 } },
        array: [1, 2, 3],
        date: '2024-01-01',
      };

      await service.set(key, value);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        key,
        300,
        JSON.stringify(value),
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('key', 'value')).resolves.not.toThrow();
    });
  });

  describe('get', () => {
    it('should return null for cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return parsed data for cache hit', async () => {
      const cachedData = { id: 1, name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.get<typeof cachedData>('existing-key');

      expect(result).toEqual(cachedData);
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.get('key');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('key');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a key from cache', async () => {
      const key = 'key-to-delete';

      await service.delete(key);

      expect(mockRedis.del).toHaveBeenCalledWith(key);
    });

    it('should handle errors gracefully', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('key')).resolves.not.toThrow();
    });
  });

  describe('deletePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const pattern = 'session:*';
      const matchingKeys = ['session:1', 'session:2', 'session:3'];
      mockRedis.keys.mockResolvedValue(matchingKeys);

      await service.deletePattern(pattern);

      expect(mockRedis.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
    });

    it('should not call del when no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.deletePattern('non-matching:*');

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.deletePattern('pattern:*')).resolves.not.toThrow();
    });
  });

  describe('increment', () => {
    it('should increment a counter', async () => {
      mockRedis.incr.mockResolvedValue(5);

      const result = await service.increment('counter');

      expect(mockRedis.incr).toHaveBeenCalledWith('counter');
      expect(result).toBe(5);
    });

    it('should set TTL on first increment when TTL is provided', async () => {
      mockRedis.incr.mockResolvedValue(1);
      const ttl = 60;

      await service.increment('new-counter', ttl);

      expect(mockRedis.incr).toHaveBeenCalledWith('new-counter');
      expect(mockRedis.expire).toHaveBeenCalledWith('new-counter', ttl);
    });

    it('should not set TTL on subsequent increments', async () => {
      mockRedis.incr.mockResolvedValue(2);
      const ttl = 60;

      await service.increment('existing-counter', ttl);

      expect(mockRedis.incr).toHaveBeenCalledWith('existing-counter');
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });

    it('should throw error on Redis failure', async () => {
      mockRedis.incr.mockRejectedValue(new Error('Redis error'));

      await expect(service.increment('counter')).rejects.toThrow('Redis error');
    });
  });

  describe('cacheSessionAvailability', () => {
    it('should cache session availability with short TTL', async () => {
      const sessionId = 'session-123';
      const data = { availableSeats: 50, totalSeats: 100 };

      await service.cacheSessionAvailability(sessionId, data);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:session-123:availability',
        10,
        JSON.stringify(data),
      );
    });
  });

  describe('getSessionAvailability', () => {
    it('should retrieve session availability from cache', async () => {
      const sessionId = 'session-123';
      const cachedData = { availableSeats: 50, totalSeats: 100 };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getSessionAvailability(sessionId);

      expect(mockRedis.get).toHaveBeenCalledWith('session:session-123:availability');
      expect(result).toEqual(cachedData);
    });

    it('should return null when session availability is not cached', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getSessionAvailability('session-456');

      expect(result).toBeNull();
    });
  });

  describe('invalidateSessionCache', () => {
    it('should delete session availability cache', async () => {
      const sessionId = 'session-789';

      await service.invalidateSessionCache(sessionId);

      expect(mockRedis.del).toHaveBeenCalledWith('session:session-789:availability');
    });
  });
});
