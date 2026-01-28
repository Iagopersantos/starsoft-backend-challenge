import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

export interface ReservationCreatedEvent {
  reservationIds: string[];
  sessionId: string;
  seatIds: string[];
  userId: string;
  expiresAt: string;
}

export interface PaymentConfirmedEvent {
  reservationId: string;
  saleId: string;
  seatId: string;
  userId: string;
  amountPaid: number;
}

export interface ReservationExpiredEvent {
  reservationId: string;
  seatId: string;
  sessionId: string;
}

export interface SaleCreatedEvent {
  saleId: string;
  reservationId: string;
  seatId: string;
  userId: string;
  amountPaid: number;
  paymentMethod: string;
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);
  private readonly exchange = 'cinema.events';

  constructor(private readonly amqpConnection: AmqpConnection) {}

  async publishReservationCreated(event: ReservationCreatedEvent) {
    try {
      await this.amqpConnection.publish(
        this.exchange,
        'reservation.created',
        event,
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `res-${Date.now()}-${Math.random()}`,
        }
      );
      
      this.logger.log(`Event published: reservation.created for ${event.reservationIds.join(',')}`);
    } catch (error) {
      this.logger.error('Failed to publish reservation.created', error);
    }
  }

  async publishPaymentConfirmed(event: PaymentConfirmedEvent) {
    try {
      await this.amqpConnection.publish(
        this.exchange,
        'payment.confirmed',
        event,
        {
          persistent: true,
          timestamp: Date.now(),
        }
      );
      
      this.logger.log(`Event published: payment.confirmed for ${event.reservationId}`);
    } catch (error) {
      this.logger.error('Failed to publish payment.confirmed', error);
    }
  }

  async publishReservationExpired(event: ReservationExpiredEvent) {
    try {
      await this.amqpConnection.publish(
        this.exchange,
        'reservation.expired',
        event,
        {
          persistent: true,
          timestamp: Date.now(),
        }
      );
      
      this.logger.log(`Event published: reservation.expired for ${event.reservationId}`);
    } catch (error) {
      this.logger.error('Failed to publish reservation.expired', error);
    }
  }

  async publishSaleCreated(event: SaleCreatedEvent) {
    try {
      await this.amqpConnection.publish(
        this.exchange,
        'sale.created',
        event,
        {
          persistent: true,
          timestamp: Date.now(),
          messageId: `sale-${Date.now()}-${Math.random()}`,
        }
      );

      this.logger.log(`Event published: sale.created for ${event.saleId}`);
    } catch (error) {
      this.logger.error('Failed to publish sale.created', error);
    }
  }
}