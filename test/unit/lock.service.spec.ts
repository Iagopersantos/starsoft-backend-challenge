import { Test, TestingModule } from '@nestjs/testing';
import { LockService } from '../../src/shared/services/lock.service';

describe('LockService', () => {
  let service: LockService;
  let mockRedlock: any;
  let mockRedis: any;
  let mockLock: any;

  beforeEach(async () => {
    mockLock = {
      release: jest.fn().mockResolvedValue(undefined),
    };

    mockRedlock = {
      acquire: jest.fn().mockResolvedValue(mockLock),
      on: jest.fn(),
    };

    mockRedis = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: LockService,
          useFactory: () => {
            const service = new LockService(mockRedis);
            (service as any).redlock = mockRedlock;
            return service;
          },
        },
      ],
    }).compile();

    service = module.get<LockService>(LockService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should acquire a lock for a single resource', async () => {
      const resource = 'seat:123';

      const lock = await service.acquireLock(resource);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(['lock:seat:123'], 5000);
      expect(lock).toBe(mockLock);
    });

    it('should acquire a lock with custom TTL', async () => {
      const resource = 'seat:456';
      const customTtl = 10000;

      await service.acquireLock(resource, customTtl);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(['lock:seat:456'], customTtl);
    });

    it('should throw error when unable to acquire lock', async () => {
      mockRedlock.acquire.mockRejectedValue(new Error('Lock timeout'));

      await expect(service.acquireLock('seat:789')).rejects.toThrow(
        'Unable to acquire lock for seat:789',
      );
    });
  });

  describe('acquireMultipleLocks', () => {
    it('should acquire multiple locks in sorted order', async () => {
      const resources = ['seat:c', 'seat:a', 'seat:b'];

      await service.acquireMultipleLocks(resources);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ['lock:seat:a', 'lock:seat:b', 'lock:seat:c'],
        5000,
      );
    });

    it('should prevent deadlocks by sorting resources alphabetically', async () => {
      const resources1 = ['seat:z', 'seat:m', 'seat:a'];
      const resources2 = ['seat:a', 'seat:z', 'seat:m'];

      await service.acquireMultipleLocks(resources1);
      await service.acquireMultipleLocks(resources2);

      const expectedOrder = ['lock:seat:a', 'lock:seat:m', 'lock:seat:z'];
      expect(mockRedlock.acquire).toHaveBeenNthCalledWith(1, expectedOrder, 5000);
      expect(mockRedlock.acquire).toHaveBeenNthCalledWith(2, expectedOrder, 5000);
    });

    it('should throw error when unable to acquire multiple locks', async () => {
      mockRedlock.acquire.mockRejectedValue(new Error('Lock timeout'));

      await expect(
        service.acquireMultipleLocks(['seat:1', 'seat:2']),
      ).rejects.toThrow('Unable to acquire all required locks');
    });

    it('should acquire multiple locks with custom TTL', async () => {
      const resources = ['seat:1', 'seat:2'];
      const customTtl = 15000;

      await service.acquireMultipleLocks(resources, customTtl);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ['lock:seat:1', 'lock:seat:2'],
        customTtl,
      );
    });
  });

  describe('releaseLock', () => {
    it('should release a lock successfully', async () => {
      await service.releaseLock(mockLock);

      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should handle release errors gracefully', async () => {
      mockLock.release.mockRejectedValue(new Error('Release failed'));

      await expect(service.releaseLock(mockLock)).resolves.not.toThrow();
    });
  });

  describe('withLock', () => {
    it('should execute callback with lock and release afterwards', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.withLock('resource', callback);

      expect(mockRedlock.acquire).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should release lock even if callback throws', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Callback error'));

      await expect(service.withLock('resource', callback)).rejects.toThrow(
        'Callback error',
      );
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should use custom TTL when provided', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      const customTtl = 20000;

      await service.withLock('resource', callback, customTtl);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(['lock:resource'], customTtl);
    });
  });

  describe('withMultipleLocks', () => {
    it('should execute callback with multiple locks and release afterwards', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      const resources = ['res1', 'res2', 'res3'];

      const result = await service.withMultipleLocks(resources, callback);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ['lock:res1', 'lock:res2', 'lock:res3'],
        5000,
      );
      expect(callback).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should release locks even if callback throws', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Callback error'));

      await expect(
        service.withMultipleLocks(['res1', 'res2'], callback),
      ).rejects.toThrow('Callback error');
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should use custom TTL when provided', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      const customTtl = 25000;

      await service.withMultipleLocks(['res1', 'res2'], callback, customTtl);

      expect(mockRedlock.acquire).toHaveBeenCalledWith(
        ['lock:res1', 'lock:res2'],
        customTtl,
      );
    });
  });
});
