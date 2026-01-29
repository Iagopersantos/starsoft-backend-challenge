import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner, EntityManager } from 'typeorm';
import { ReservationsService } from '../../src/modules/reservations/reservations.service';
import { ReservationsRepository } from '../../src/modules/reservations/reservations.repository';
import { SeatsRepository } from '../../src/modules/seats/seats.repository';
import { LockService } from '../../src/shared/services/lock.service';
import { CacheService } from '../../src/shared/services/cache.service';
import { EventService } from '../../src/shared/services/event.service';
import { ReservationStatus } from '../../src/database/entities/reservation.entity';
import { SeatStatus } from '../../src/database/entities/seats.entity';
import { CreateReservationDto } from '../../src/modules/reservations/dto/create-reservation.dto';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationsRepository: jest.Mocked<ReservationsRepository>;
  let seatsRepository: jest.Mocked<SeatsRepository>;
  let lockService: jest.Mocked<LockService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventService: jest.Mocked<EventService>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockSeat = {
    id: 'seat-uuid-1',
    sessionId: 'session-uuid-1',
    seatNumber: 'A1',
    row: 'A',
    status: SeatStatus.AVAILABLE,
    version: 1,
    session: {
      id: 'session-uuid-1',
      ticketPrice: 25.0,
    },
  };

  const mockReservation = {
    id: 'reservation-uuid-1',
    seatId: 'seat-uuid-1',
    userId: 'user-123',
    status: ReservationStatus.PENDING,
    expiresAt: new Date(Date.now() + 30000),
    seat: mockSeat,
  };

  beforeEach(async () => {
    entityManager = {
      update: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 'sale-uuid-1' }),
    } as unknown as jest.Mocked<EntityManager>;

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: entityManager,
    } as unknown as jest.Mocked<QueryRunner>;

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as unknown as jest.Mocked<DataSource>;

    reservationsRepository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findByIdsWithLock: jest.fn(),
      createReservation: jest.fn().mockResolvedValue(mockReservation),
      findByIdWithLock: jest.fn(),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      findExpiredPending: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<ReservationsRepository>;

    seatsRepository = {
      findByIdsWithLock: jest.fn().mockResolvedValue([mockSeat]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
      updateSingleStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SeatsRepository>;

    lockService = {
      withMultipleLocks: jest
        .fn()
        .mockImplementation((_, callback) => callback()),
      withLock: jest.fn().mockImplementation((_, callback) => callback()),
    } as unknown as jest.Mocked<LockService>;

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

  describe('createReservation', () => {
    const createDto: CreateReservationDto = {
      seatIds: ['seat-uuid-1'],
      userId: 'user-123',
      idempotencyKey: 'idemp-key-123',
    };

    it('should create a reservation successfully', async () => {
      const result = await service.createReservation(createDto);

      expect(lockService.withMultipleLocks).toHaveBeenCalled();
      expect(seatsRepository.findByIdsWithLock).toHaveBeenCalledWith(
        createDto.seatIds,
        entityManager,
      );
      expect(seatsRepository.updateStatus).toHaveBeenCalledWith(
        createDto.seatIds,
        SeatStatus.RESERVED,
        entityManager,
      );
      expect(reservationsRepository.createReservation).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(cacheService.invalidateSessionCache).toHaveBeenCalled();
      expect(eventService.publishReservationCreated).toHaveBeenCalled();
      expect(result).toHaveProperty('reservations');
      expect(result).toHaveProperty('expiresIn', 30);
    });

    it('should return existing reservation for idempotent request (pending)', async () => {
      const existingReservation = {
        ...mockReservation,
        idempotencyKey: 'idemp-key-123',
        expiresAt: new Date(Date.now() + 20000),
      };
      reservationsRepository.findByIdempotencyKey.mockResolvedValue(
        existingReservation as any,
      );

      const result = await service.createReservation(createDto);

      expect(result.message).toContain('idempotência');
      expect(lockService.withMultipleLocks).not.toHaveBeenCalled();
    });

    it('should return existing reservation for idempotent request (confirmed)', async () => {
      const confirmedReservation = {
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
        idempotencyKey: 'idemp-key-123',
      };
      reservationsRepository.findByIdempotencyKey.mockResolvedValue(
        confirmedReservation as any,
      );

      const result = await service.createReservation(createDto);

      expect(result.message).toContain('já confirmada');
      expect(result.expiresIn).toBe(0);
    });

    it('should allow new reservation when previous expired', async () => {
      const expiredReservation = {
        ...mockReservation,
        status: ReservationStatus.PENDING,
        expiresAt: new Date(Date.now() - 10000),
        idempotencyKey: 'idemp-key-123',
      };
      reservationsRepository.findByIdempotencyKey.mockResolvedValue(
        expiredReservation as any,
      );

      await service.createReservation(createDto);

      expect(lockService.withMultipleLocks).toHaveBeenCalled();
      expect(entityManager.update).toHaveBeenCalledWith(
        'reservations',
        { id: expiredReservation.id },
        { idempotencyKey: null },
      );
    });

    it('should throw BadRequestException when seat not found', async () => {
      seatsRepository.findByIdsWithLock.mockResolvedValue([]);

      await expect(service.createReservation(createDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw ConflictException when seat not available', async () => {
      seatsRepository.findByIdsWithLock.mockResolvedValue([
        { ...mockSeat, status: SeatStatus.RESERVED },
      ]);

      await expect(service.createReservation(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException when seats from different sessions', async () => {
      const dto: CreateReservationDto = {
        seatIds: ['seat-1', 'seat-2'],
        userId: 'user-123',
      };

      seatsRepository.findByIdsWithLock.mockResolvedValue([
        { ...mockSeat, id: 'seat-1', sessionId: 'session-1' },
        { ...mockSeat, id: 'seat-2', sessionId: 'session-2' },
      ]);

      await expect(service.createReservation(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should acquire locks in sorted order', async () => {
      const dto: CreateReservationDto = {
        seatIds: ['seat-c', 'seat-a', 'seat-b'],
        userId: 'user-123',
      };

      seatsRepository.findByIdsWithLock.mockResolvedValue([
        { ...mockSeat, id: 'seat-a' },
        { ...mockSeat, id: 'seat-b' },
        { ...mockSeat, id: 'seat-c' },
      ]);

      await service.createReservation(dto);

      expect(lockService.withMultipleLocks).toHaveBeenCalledWith(
        ['seat:seat-c', 'seat:seat-a', 'seat:seat-b'],
        expect.any(Function),
        10000,
      );
    });
  });

  describe('confirmPayment', () => {
    const reservationId = 'reservation-uuid-1';

    beforeEach(() => {
      reservationsRepository.findByIdWithLock.mockResolvedValue({
        ...mockReservation,
        seat: {
          ...mockSeat,
          session: { id: 'session-uuid-1', ticketPrice: 25.0 },
        },
      } as any);
    });

    it('should confirm payment successfully', async () => {
      const result = await service.confirmPayment(reservationId, 'credit_card');

      expect(lockService.withLock).toHaveBeenCalledWith(
        `reservation:${reservationId}`,
        expect.any(Function),
      );
      expect(reservationsRepository.updateStatus).toHaveBeenCalledWith(
        reservationId,
        ReservationStatus.CONFIRMED,
        entityManager,
      );
      expect(seatsRepository.updateSingleStatus).toHaveBeenCalledWith(
        mockReservation.seatId,
        SeatStatus.SOLD,
        entityManager,
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(cacheService.invalidateSessionCache).toHaveBeenCalled();
      expect(eventService.publishPaymentConfirmed).toHaveBeenCalled();
      expect(result).toHaveProperty('saleId');
      expect(result).toHaveProperty(
        'message',
        'Pagamento confirmado com sucesso!',
      );
    });

    it('should throw BadRequestException when reservation not found', async () => {
      reservationsRepository.findByIdWithLock.mockResolvedValue(null);

      await expect(service.confirmPayment(reservationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when reservation already confirmed', async () => {
      reservationsRepository.findByIdWithLock.mockResolvedValue({
        ...mockReservation,
        status: ReservationStatus.CONFIRMED,
      } as any);

      await expect(service.confirmPayment(reservationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when reservation expired', async () => {
      reservationsRepository.findByIdWithLock.mockResolvedValue({
        ...mockReservation,
        expiresAt: new Date(Date.now() - 10000),
      } as any);

      await expect(service.confirmPayment(reservationId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use default payment method when not specified', async () => {
      await service.confirmPayment(reservationId);

      expect(entityManager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          paymentMethod: 'not_specified',
        }),
      );
    });

    it('should rollback transaction on error', async () => {
      entityManager.save.mockRejectedValue(new Error('DB Error'));

      await expect(service.confirmPayment(reservationId)).rejects.toThrow();
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('expireReservations', () => {
    it('should not do anything when no expired reservations', async () => {
      reservationsRepository.findExpiredPending.mockResolvedValue([]);

      await service.expireReservations();

      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should expire pending reservations', async () => {
      const expiredReservations = [
        {
          ...mockReservation,
          id: 'expired-1',
          seat: { ...mockSeat, sessionId: 'session-1' },
        },
        {
          ...mockReservation,
          id: 'expired-2',
          seat: { ...mockSeat, sessionId: 'session-2' },
        },
      ];
      reservationsRepository.findExpiredPending.mockResolvedValue(
        expiredReservations as any,
      );

      await service.expireReservations();

      expect(reservationsRepository.updateStatus).toHaveBeenCalledTimes(2);
      expect(seatsRepository.updateSingleStatus).toHaveBeenCalledTimes(2);
      expect(eventService.publishReservationExpired).toHaveBeenCalledTimes(2);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should update reservation status to EXPIRED', async () => {
      const expiredReservation = {
        ...mockReservation,
        id: 'expired-1',
        seat: mockSeat,
      };
      reservationsRepository.findExpiredPending.mockResolvedValue([
        expiredReservation,
      ] as any);

      await service.expireReservations();

      expect(reservationsRepository.updateStatus).toHaveBeenCalledWith(
        'expired-1',
        ReservationStatus.EXPIRED,
        entityManager,
      );
    });

    it('should update seat status to AVAILABLE', async () => {
      const expiredReservation = {
        ...mockReservation,
        id: 'expired-1',
        seatId: 'seat-to-release',
        seat: mockSeat,
      };
      reservationsRepository.findExpiredPending.mockResolvedValue([
        expiredReservation,
      ] as any);

      await service.expireReservations();

      expect(seatsRepository.updateSingleStatus).toHaveBeenCalledWith(
        'seat-to-release',
        SeatStatus.AVAILABLE,
        entityManager,
      );
    });

    it('should rollback transaction on error', async () => {
      reservationsRepository.findExpiredPending.mockResolvedValue([
        mockReservation,
      ] as any);
      reservationsRepository.updateStatus.mockRejectedValue(
        new Error('DB Error'),
      );

      await service.expireReservations();

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should publish expiration event for each expired reservation', async () => {
      const expiredReservation = {
        ...mockReservation,
        id: 'expired-res-id',
        seatId: 'expired-seat-id',
        seat: { ...mockSeat, sessionId: 'expired-session-id' },
      };
      reservationsRepository.findExpiredPending.mockResolvedValue([
        expiredReservation,
      ] as any);

      await service.expireReservations();

      expect(eventService.publishReservationExpired).toHaveBeenCalledWith({
        reservationId: 'expired-res-id',
        seatId: 'expired-seat-id',
        sessionId: 'expired-session-id',
      });
    });
  });
});
