import { Test, TestingModule } from '@nestjs/testing';
import {
  EventService,
  ReservationCreatedEvent,
  PaymentConfirmedEvent,
  ReservationExpiredEvent,
  SaleCreatedEvent,
} from '../../src/shared/services/event.service';

describe('EventService', () => {
  let service: EventService;
  let mockAmqpConnection: any;

  beforeEach(async () => {
    mockAmqpConnection = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: 'AmqpConnection',
          useValue: mockAmqpConnection,
        },
      ],
    })
      .overrideProvider(EventService)
      .useFactory({
        factory: () => new EventService(mockAmqpConnection),
      })
      .compile();

    service = module.get<EventService>(EventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishReservationCreated', () => {
    it('should publish reservation.created event', async () => {
      const event: ReservationCreatedEvent = {
        reservationIds: ['res-1', 'res-2'],
        sessionId: 'session-123',
        seatIds: ['seat-1', 'seat-2'],
        userId: 'user-123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      await service.publishReservationCreated(event);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cinema.events',
        'reservation.created',
        event,
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
          messageId: expect.stringMatching(/^res-\d+-/),
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      mockAmqpConnection.publish.mockRejectedValue(new Error('RabbitMQ error'));

      const event: ReservationCreatedEvent = {
        reservationIds: ['res-1'],
        sessionId: 'session-123',
        seatIds: ['seat-1'],
        userId: 'user-123',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      await expect(service.publishReservationCreated(event)).resolves.not.toThrow();
    });

    it('should include all required fields in the event', async () => {
      const event: ReservationCreatedEvent = {
        reservationIds: ['res-uuid-1'],
        sessionId: 'session-uuid',
        seatIds: ['seat-uuid-1', 'seat-uuid-2'],
        userId: 'user-uuid',
        expiresAt: '2024-06-15T10:30:00Z',
      };

      await service.publishReservationCreated(event);

      const publishedEvent = mockAmqpConnection.publish.mock.calls[0][2];
      expect(publishedEvent).toHaveProperty('reservationIds');
      expect(publishedEvent).toHaveProperty('sessionId');
      expect(publishedEvent).toHaveProperty('seatIds');
      expect(publishedEvent).toHaveProperty('userId');
      expect(publishedEvent).toHaveProperty('expiresAt');
    });
  });

  describe('publishPaymentConfirmed', () => {
    it('should publish payment.confirmed event', async () => {
      const event: PaymentConfirmedEvent = {
        reservationId: 'res-123',
        saleId: 'sale-456',
        seatId: 'seat-789',
        userId: 'user-123',
        amountPaid: 25.5,
      };

      await service.publishPaymentConfirmed(event);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cinema.events',
        'payment.confirmed',
        event,
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      mockAmqpConnection.publish.mockRejectedValue(new Error('RabbitMQ error'));

      const event: PaymentConfirmedEvent = {
        reservationId: 'res-123',
        saleId: 'sale-456',
        seatId: 'seat-789',
        userId: 'user-123',
        amountPaid: 25.5,
      };

      await expect(service.publishPaymentConfirmed(event)).resolves.not.toThrow();
    });

    it('should include correct amount in the event', async () => {
      const event: PaymentConfirmedEvent = {
        reservationId: 'res-123',
        saleId: 'sale-456',
        seatId: 'seat-789',
        userId: 'user-123',
        amountPaid: 99.99,
      };

      await service.publishPaymentConfirmed(event);

      const publishedEvent = mockAmqpConnection.publish.mock.calls[0][2];
      expect(publishedEvent.amountPaid).toBe(99.99);
    });
  });

  describe('publishReservationExpired', () => {
    it('should publish reservation.expired event', async () => {
      const event: ReservationExpiredEvent = {
        reservationId: 'res-expired-123',
        seatId: 'seat-456',
        sessionId: 'session-789',
      };

      await service.publishReservationExpired(event);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cinema.events',
        'reservation.expired',
        event,
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      mockAmqpConnection.publish.mockRejectedValue(new Error('RabbitMQ error'));

      const event: ReservationExpiredEvent = {
        reservationId: 'res-expired-123',
        seatId: 'seat-456',
        sessionId: 'session-789',
      };

      await expect(service.publishReservationExpired(event)).resolves.not.toThrow();
    });
  });

  describe('publishSaleCreated', () => {
    it('should publish sale.created event', async () => {
      const event: SaleCreatedEvent = {
        saleId: 'sale-123',
        reservationId: 'res-456',
        seatId: 'seat-789',
        userId: 'user-123',
        amountPaid: 35.0,
        paymentMethod: 'credit_card',
      };

      await service.publishSaleCreated(event);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        'cinema.events',
        'sale.created',
        event,
        expect.objectContaining({
          persistent: true,
          timestamp: expect.any(Number),
          messageId: expect.stringMatching(/^sale-\d+-/),
        }),
      );
    });

    it('should handle publish errors gracefully', async () => {
      mockAmqpConnection.publish.mockRejectedValue(new Error('RabbitMQ error'));

      const event: SaleCreatedEvent = {
        saleId: 'sale-123',
        reservationId: 'res-456',
        seatId: 'seat-789',
        userId: 'user-123',
        amountPaid: 35.0,
        paymentMethod: 'pix',
      };

      await expect(service.publishSaleCreated(event)).resolves.not.toThrow();
    });

    it('should include payment method in the event', async () => {
      const event: SaleCreatedEvent = {
        saleId: 'sale-123',
        reservationId: 'res-456',
        seatId: 'seat-789',
        userId: 'user-123',
        amountPaid: 35.0,
        paymentMethod: 'debit_card',
      };

      await service.publishSaleCreated(event);

      const publishedEvent = mockAmqpConnection.publish.mock.calls[0][2];
      expect(publishedEvent.paymentMethod).toBe('debit_card');
    });
  });

  describe('exchange configuration', () => {
    it('should use cinema.events exchange for all events', async () => {
      const reservationEvent: ReservationCreatedEvent = {
        reservationIds: ['res-1'],
        sessionId: 'session-1',
        seatIds: ['seat-1'],
        userId: 'user-1',
        expiresAt: '2024-01-01T12:00:00Z',
      };

      const paymentEvent: PaymentConfirmedEvent = {
        reservationId: 'res-1',
        saleId: 'sale-1',
        seatId: 'seat-1',
        userId: 'user-1',
        amountPaid: 25.0,
      };

      await service.publishReservationCreated(reservationEvent);
      await service.publishPaymentConfirmed(paymentEvent);

      expect(mockAmqpConnection.publish.mock.calls[0][0]).toBe('cinema.events');
      expect(mockAmqpConnection.publish.mock.calls[1][0]).toBe('cinema.events');
    });
  });
});
