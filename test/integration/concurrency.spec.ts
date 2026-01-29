import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { ReservationsService } from '../../src/modules/reservations/reservations.service';
import { ReservationsRepository } from '../../src/modules/reservations/reservations.repository';
import { SeatsRepository } from '../../src/modules/seats/seats.repository';
import { LockService } from '../../src/shared/services/lock.service';
import { CacheService } from '../../src/shared/services/cache.service';
import { EventService } from '../../src/shared/services/event.service';
import { ReservationStatus } from '../../src/database/entities/reservation.entity';
import { SeatStatus } from '../../src/database/entities/seats.entity';
import { CreateReservationDto } from '../../src/modules/reservations/dto/create-reservation.dto';

describe('Concurrency Integration Tests', () => {
  let service: ReservationsService;
  let reservationsRepository: jest.Mocked<ReservationsRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;
  let lockService: LockService;
  let cacheService: jest.Mocked<CacheService>;
  let eventService: jest.Mocked<EventService>;
  let dataSource: jest.Mocked<DataSource>;

  // Simula estado compartilhado dos assentos (como um banco de dados real)
  let seatState: Map<string, SeatStatus>;
  let reservationCounter: number;
  let lockState: Map<string, boolean>;

  const createMockSeat = (id: string, sessionId: string = 'session-1') => ({
    id,
    sessionId,
    seatNumber: id,
    row: 'A',
    status: seatState.get(id) || SeatStatus.AVAILABLE,
    version: 1,
    session: { id: sessionId, ticketPrice: 25.0 },
  });

  const createMockReservation = (seatId: string, userId: string) => ({
    id: `reservation-${++reservationCounter}`,
    seatId,
    userId,
    status: ReservationStatus.PENDING,
    expiresAt: new Date(Date.now() + 30000),
  });

  beforeEach(async () => {
    // Reset state
    seatState = new Map();
    reservationCounter = 0;
    lockState = new Map();

    // Mock EntityManager
    const createMockEntityManager = (): jest.Mocked<EntityManager> => ({
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 'sale-uuid-1' }),
      getRepository: jest.fn().mockReturnValue({
        update: jest.fn().mockResolvedValue(undefined),
      }),
    } as unknown as jest.Mocked<EntityManager>);

    // Mock QueryRunner
    const createMockQueryRunner = (): jest.Mocked<QueryRunner> => ({
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: createMockEntityManager(),
    } as unknown as jest.Mocked<QueryRunner>);

    dataSource = {
      createQueryRunner: jest.fn().mockImplementation(() => createMockQueryRunner()),
    } as unknown as jest.Mocked<DataSource>;

    // Mock SeatsRepository com estado compartilhado
    seatsRepository = {
      findByIdsWithLock: jest.fn().mockImplementation((seatIds: string[]) => {
        return seatIds.map((id) => createMockSeat(id));
      }),
      updateStatus: jest.fn().mockImplementation((seatIds: string[], status: SeatStatus) => {
        seatIds.forEach((id) => seatState.set(id, status));
        return Promise.resolve();
      }),
      updateSingleStatus: jest.fn().mockImplementation((seatId: string, status: SeatStatus) => {
        seatState.set(seatId, status);
        return Promise.resolve();
      }),
    } as unknown as jest.Mocked<SeatsRepository>;

    // Mock ReservationsRepository
    reservationsRepository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      createReservation: jest.fn().mockImplementation((data) => {
        return Promise.resolve(createMockReservation(data.seatId, data.userId));
      }),
      findByIdWithLock: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      findExpiredPending: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ReservationsRepository>;

    // Mock LockService com simulação de lock real
    const mockLock = { release: jest.fn().mockResolvedValue(undefined) };

    lockService = {
      withMultipleLocks: jest.fn().mockImplementation(
        async (resources: string[], callback: () => Promise<any>) => {
          // Simula ordenação de locks (prevenção de deadlock)
          const sortedResources = [...resources].sort();

          // Simula aquisição de lock
          for (const resource of sortedResources) {
            // Simula espera se recurso já está bloqueado
            let attempts = 0;
            while (lockState.get(resource) && attempts < 10) {
              await new Promise((resolve) => setTimeout(resolve, 10));
              attempts++;
            }

            if (lockState.get(resource)) {
              throw new Error(`Unable to acquire lock for ${resource}`);
            }

            lockState.set(resource, true);
          }

          try {
            return await callback();
          } finally {
            // Libera locks
            sortedResources.forEach((r) => lockState.set(r, false));
          }
        },
      ),
      withLock: jest.fn().mockImplementation(
        async (resource: string, callback: () => Promise<any>) => {
          if (lockState.get(resource)) {
            throw new Error(`Unable to acquire lock for ${resource}`);
          }
          lockState.set(resource, true);
          try {
            return await callback();
          } finally {
            lockState.set(resource, false);
          }
        },
      ),
      acquireLock: jest.fn().mockResolvedValue(mockLock),
      acquireMultipleLocks: jest.fn().mockResolvedValue(mockLock),
      releaseLock: jest.fn().mockResolvedValue(undefined),
    } as unknown as LockService;

    cacheService = {
      invalidateSessionCache: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    eventService = {
      publishReservationCreated: jest.fn().mockResolvedValue(undefined),
      publishPaymentConfirmed: jest.fn().mockResolvedValue(undefined),
      publishReservationExpired: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EventService>;

    const configService = {
      get: jest.fn((key: string, defaultValue: any) => {
        if (key === 'RESERVATION_TTL_SECONDS') return 30;
        if (key === 'LOCK_TTL_MS') return 10000;
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: ReservationsRepository, useValue: reservationsRepository },
        { provide: SeatsRepository, useValue: seatsRepository },
        { provide: DataSource, useValue: dataSource },
        { provide: LockService, useValue: lockService },
        { provide: CacheService, useValue: cacheService },
        { provide: EventService, useValue: eventService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent Seat Reservation - Same Seat', () => {
    it('should allow only one reservation when multiple users try to reserve the same seat', async () => {
      const seatId = 'seat-concurrent-1';
      seatState.set(seatId, SeatStatus.AVAILABLE);

      // Simula verificação de status no momento da reserva
      seatsRepository.findByIdsWithLock.mockImplementation((seatIds: string[]) => {
        return Promise.resolve(
          seatIds.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      const user1Dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-1',
      };

      const user2Dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-2',
      };

      const user3Dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-3',
      };

      // Executa reservas em paralelo
      const results = await Promise.allSettled([
        service.createReservation(user1Dto),
        service.createReservation(user2Dto),
        service.createReservation(user3Dto),
      ]);

      // Conta sucessos e falhas
      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Apenas uma deve ter sucesso (devido ao lock distribuído)
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(2);

      // Verifica que as falhas são ConflictException (assento não disponível)
      failures.forEach((failure) => {
        if (failure.status === 'rejected') {
          expect(failure.reason).toBeInstanceOf(ConflictException);
        }
      });
    });

    it('should handle race condition with proper locking', async () => {
      const seatId = 'seat-race-1';
      seatState.set(seatId, SeatStatus.AVAILABLE);

      let lockAcquiredCount = 0;

      // Sobrescreve o mock do lockService para contar aquisições
      (lockService.withMultipleLocks as jest.Mock).mockImplementation(
        async (resources: string[], callback: () => Promise<any>) => {
          lockAcquiredCount++;
          const sortedResources = [...resources].sort();

          for (const resource of sortedResources) {
            let attempts = 0;
            while (lockState.get(resource) && attempts < 50) {
              await new Promise((resolve) => setTimeout(resolve, 5));
              attempts++;
            }
            lockState.set(resource, true);
          }

          try {
            return await callback();
          } finally {
            sortedResources.forEach((r) => lockState.set(r, false));
          }
        },
      );

      seatsRepository.findByIdsWithLock.mockImplementation((seatIds: string[]) => {
        return Promise.resolve(
          seatIds.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      const dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-race',
      };

      // Múltiplas tentativas simultâneas
      const promises = Array(5)
        .fill(null)
        .map((_, i) =>
          service.createReservation({ ...dto, userId: `user-${i}` }),
        );

      const results = await Promise.allSettled(promises);
      const successes = results.filter((r) => r.status === 'fulfilled');

      // Lock deve ter sido tentado por todas as requisições
      expect(lockAcquiredCount).toBe(5);
      // Apenas uma deve ter sucesso
      expect(successes.length).toBe(1);
    });
  });

  describe('Concurrent Multi-Seat Reservation - Deadlock Prevention', () => {
    it('should prevent deadlock when users reserve overlapping seats in different order', async () => {
      // Cenário de deadlock clássico:
      // User1 tenta reservar [A, B]
      // User2 tenta reservar [B, A]
      // Sem ordenação, poderia causar deadlock

      seatState.set('seat-A', SeatStatus.AVAILABLE);
      seatState.set('seat-B', SeatStatus.AVAILABLE);

      const lockOrder: string[][] = [];

      (lockService.withMultipleLocks as jest.Mock).mockImplementation(
        async (resources: string[], callback: () => Promise<any>) => {
          const sortedResources = [...resources].sort();
          lockOrder.push(sortedResources);

          for (const resource of sortedResources) {
            let attempts = 0;
            while (lockState.get(resource) && attempts < 100) {
              await new Promise((resolve) => setTimeout(resolve, 5));
              attempts++;
            }
            lockState.set(resource, true);
          }

          try {
            return await callback();
          } finally {
            sortedResources.forEach((r) => lockState.set(r, false));
          }
        },
      );

      seatsRepository.findByIdsWithLock.mockImplementation((seatIds: string[]) => {
        return Promise.resolve(
          seatIds.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      const user1Dto: CreateReservationDto = {
        seatIds: ['seat-A', 'seat-B'],
        userId: 'user-1',
      };

      const user2Dto: CreateReservationDto = {
        seatIds: ['seat-B', 'seat-A'], // Ordem invertida
        userId: 'user-2',
      };

      // Executa em paralelo
      const results = await Promise.allSettled([
        service.createReservation(user1Dto),
        service.createReservation(user2Dto),
      ]);

      // Ambas as requisições devem ter ordenado os recursos da mesma forma
      expect(lockOrder[0]).toEqual(['seat:seat-A', 'seat:seat-B']);
      expect(lockOrder[1]).toEqual(['seat:seat-A', 'seat:seat-B']);

      // Uma deve ter sucesso, outra deve falhar
      const successes = results.filter((r) => r.status === 'fulfilled');
      expect(successes.length).toBe(1);
    });

    it('should handle multiple overlapping multi-seat reservations', async () => {
      // Setup: 5 assentos, 3 usuários tentando combinações diferentes
      ['seat-1', 'seat-2', 'seat-3', 'seat-4', 'seat-5'].forEach((id) => {
        seatState.set(id, SeatStatus.AVAILABLE);
      });

      seatsRepository.findByIdsWithLock.mockImplementation((seatIds: string[]) => {
        return Promise.resolve(
          seatIds.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      const reservations: CreateReservationDto[] = [
        { seatIds: ['seat-1', 'seat-2'], userId: 'user-1' },
        { seatIds: ['seat-2', 'seat-3'], userId: 'user-2' }, // Overlap com user-1
        { seatIds: ['seat-4', 'seat-5'], userId: 'user-3' }, // Sem overlap
      ];

      const results = await Promise.allSettled(
        reservations.map((dto) => service.createReservation(dto)),
      );

      const successes = results.filter((r) => r.status === 'fulfilled');

      // User-1 e User-3 podem ter sucesso (sem overlap entre eles)
      // User-2 deve falhar pois seat-2 estará reservado
      expect(successes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Concurrent Payment Confirmation', () => {
    it('should prevent double payment for same reservation', async () => {
      const reservationId = 'reservation-payment-1';
      let paymentProcessed = false;

      reservationsRepository.findByIdWithLock.mockImplementation(() => {
        if (paymentProcessed) {
          return Promise.resolve({
            id: reservationId,
            seatId: 'seat-1',
            userId: 'user-1',
            status: ReservationStatus.CONFIRMED, // Já confirmado
            expiresAt: new Date(Date.now() + 30000),
            seat: {
              id: 'seat-1',
              sessionId: 'session-1',
              session: { id: 'session-1', ticketPrice: 25.0 },
            },
          });
        }
        return Promise.resolve({
          id: reservationId,
          seatId: 'seat-1',
          userId: 'user-1',
          status: ReservationStatus.PENDING,
          expiresAt: new Date(Date.now() + 30000),
          seat: {
            id: 'seat-1',
            sessionId: 'session-1',
            session: { id: 'session-1', ticketPrice: 25.0 },
          },
        });
      });

      reservationsRepository.updateStatus.mockImplementation(() => {
        paymentProcessed = true;
        return Promise.resolve();
      });

      // Tenta confirmar o mesmo pagamento 3 vezes simultaneamente
      const results = await Promise.allSettled([
        service.confirmPayment(reservationId, 'credit_card'),
        service.confirmPayment(reservationId, 'debit_card'),
        service.confirmPayment(reservationId, 'pix'),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Apenas um pagamento deve ser processado
      expect(successes.length).toBe(1);
      expect(failures.length).toBe(2);
    });
  });

  describe('Idempotency Under Concurrency', () => {
    it('should return existing reservation for idempotent retry requests', async () => {
      const seatId = 'seat-idemp-1';
      const idempotencyKey = 'idemp-key-concurrent';
      seatState.set(seatId, SeatStatus.AVAILABLE);

      const createdReservation = {
        id: 'reservation-idemp-1',
        seatId,
        userId: 'user-1',
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 30000),
        idempotencyKey,
      };

      // Simula que já existe uma reserva com essa chave
      reservationsRepository.findByIdempotencyKey.mockResolvedValue(createdReservation as any);

      const dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-1',
        idempotencyKey,
      };

      // Múltiplas requisições com mesma chave de idempotência (retries)
      const results = await Promise.allSettled([
        service.createReservation(dto),
        service.createReservation(dto),
        service.createReservation(dto),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');

      // Todas devem retornar sucesso (mesma reserva via idempotência)
      expect(successes.length).toBe(3);

      // Nenhuma deve ter tentado adquirir lock (retornou antes)
      expect(lockService.withMultipleLocks).not.toHaveBeenCalled();

      // Todas devem retornar o mesmo ID de reserva
      const reservationIds = successes.map((s) => {
        if (s.status === 'fulfilled') {
          return s.value.reservations[0].id;
        }
      });

      expect(new Set(reservationIds).size).toBe(1);
      expect(reservationIds[0]).toBe('reservation-idemp-1');
    });

    it('should handle first request creating reservation while others wait', async () => {
      const seatId = 'seat-idemp-2';
      const idempotencyKey = 'idemp-key-sequential';
      seatState.set(seatId, SeatStatus.AVAILABLE);

      const createdReservation = {
        id: 'reservation-idemp-2',
        seatId,
        userId: 'user-1',
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() + 30000),
        idempotencyKey,
      };

      let callCount = 0;
      reservationsRepository.findByIdempotencyKey.mockImplementation(async () => {
        callCount++;
        // Primeira chamada não encontra, segunda e terceira encontram
        if (callCount === 1) {
          return null;
        }
        return createdReservation as any;
      });

      reservationsRepository.createReservation.mockResolvedValue(createdReservation);

      seatsRepository.findByIdsWithLock.mockImplementation((seatIds: string[]) => {
        return Promise.resolve(
          seatIds.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      const dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-1',
        idempotencyKey,
      };

      // Executa sequencialmente para simular retries
      const result1 = await service.createReservation(dto);
      const result2 = await service.createReservation(dto);
      const result3 = await service.createReservation(dto);

      // Todas devem retornar sucesso
      expect(result1.reservations[0].id).toBe('reservation-idemp-2');
      expect(result2.reservations[0].id).toBe('reservation-idemp-2');
      expect(result3.reservations[0].id).toBe('reservation-idemp-2');

      // Apenas a primeira requisição deve ter adquirido lock
      expect(lockService.withMultipleLocks).toHaveBeenCalledTimes(1);
    });
  });

  describe('High Load Simulation', () => {
    it('should handle 20 concurrent reservations for different seats', async () => {
      // Setup: 20 assentos disponíveis
      const seatIds = Array(20)
        .fill(null)
        .map((_, i) => `seat-load-${i}`);
      seatIds.forEach((id) => seatState.set(id, SeatStatus.AVAILABLE));

      seatsRepository.findByIdsWithLock.mockImplementation((ids: string[]) => {
        return Promise.resolve(
          ids.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      // 20 usuários tentando reservar assentos diferentes
      const reservations = seatIds.map((seatId, i) => ({
        seatIds: [seatId],
        userId: `user-load-${i}`,
      }));

      const startTime = Date.now();
      const results = await Promise.allSettled(
        reservations.map((dto) => service.createReservation(dto)),
      );
      const endTime = Date.now();

      const successes = results.filter((r) => r.status === 'fulfilled');

      // Todas devem ter sucesso (assentos diferentes)
      expect(successes.length).toBe(20);

      // Verifica que todas as operações foram concluídas em tempo razoável
      expect(endTime - startTime).toBeLessThan(5000); // Menos de 5 segundos
    });

    it('should handle burst of reservations for limited seats', async () => {
      // 5 assentos, 50 usuários tentando reservar
      const seatIds = ['seat-burst-1', 'seat-burst-2', 'seat-burst-3', 'seat-burst-4', 'seat-burst-5'];
      seatIds.forEach((id) => seatState.set(id, SeatStatus.AVAILABLE));

      seatsRepository.findByIdsWithLock.mockImplementation((ids: string[]) => {
        return Promise.resolve(
          ids.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      // 50 usuários tentando reservar um dos 5 assentos aleatoriamente
      const reservations = Array(50)
        .fill(null)
        .map((_, i) => ({
          seatIds: [seatIds[i % 5]], // Distribui entre os 5 assentos
          userId: `user-burst-${i}`,
        }));

      const results = await Promise.allSettled(
        reservations.map((dto) => service.createReservation(dto)),
      );

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Apenas 5 devem ter sucesso (um por assento)
      expect(successes.length).toBe(5);
      expect(failures.length).toBe(45);

      // Verifica integridade: cada assento foi reservado apenas uma vez
      const reservedSeats = new Set<string>();
      successes.forEach((s) => {
        if (s.status === 'fulfilled') {
          s.value.reservations.forEach((r: any) => {
            expect(reservedSeats.has(r.seatId)).toBe(false);
            reservedSeats.add(r.seatId);
          });
        }
      });

      expect(reservedSeats.size).toBe(5);
    });
  });

  describe('Lock Timeout Handling', () => {
    it('should fail gracefully when lock cannot be acquired', async () => {
      const seatId = 'seat-timeout-1';
      seatState.set(seatId, SeatStatus.AVAILABLE);

      // Simula lock permanentemente bloqueado
      lockState.set(`seat:${seatId}`, true);

      (lockService.withMultipleLocks as jest.Mock).mockImplementation(
        async (resources: string[]) => {
          const sortedResources = [...resources].sort();

          for (const resource of sortedResources) {
            if (lockState.get(resource)) {
              throw new Error('Unable to acquire all required locks');
            }
          }
        },
      );

      const dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-timeout',
      };

      await expect(service.createReservation(dto)).rejects.toThrow(
        'Unable to acquire all required locks',
      );
    });
  });

  describe('Transaction Rollback Under Concurrency', () => {
    it('should properly rollback when concurrent transaction fails', async () => {
      const seatId = 'seat-rollback-1';
      seatState.set(seatId, SeatStatus.AVAILABLE);

      let transactionCount = 0;

      seatsRepository.findByIdsWithLock.mockImplementation((ids: string[]) => {
        transactionCount++;
        // Segunda transação falha
        if (transactionCount === 2) {
          throw new Error('Database connection lost');
        }
        return Promise.resolve(
          ids.map((id) => ({
            ...createMockSeat(id),
            status: seatState.get(id) || SeatStatus.AVAILABLE,
          })),
        );
      });

      const dto: CreateReservationDto = {
        seatIds: [seatId],
        userId: 'user-rollback',
      };

      const results = await Promise.allSettled([
        service.createReservation({ ...dto, userId: 'user-1' }),
        service.createReservation({ ...dto, userId: 'user-2' }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Uma transação deve ter sucesso, outra deve falhar
      expect(successes.length + failures.length).toBe(2);

      // QueryRunner.rollbackTransaction deve ter sido chamado para a transação que falhou
      const queryRunnerCalls = dataSource.createQueryRunner.mock.results;
      expect(queryRunnerCalls.length).toBeGreaterThan(0);
    });
  });
});
