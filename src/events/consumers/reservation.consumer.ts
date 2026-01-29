import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type {
  ReservationCreatedEvent,
  PaymentConfirmedEvent,
  ReservationExpiredEvent,
} from '../../shared/services/event.service';
import { ReservationCreatedHandler } from '../handlers/reservation-created.handler';
import { PaymentConfirmedHandler } from '../handlers/payment-confirmed.handler';
import { ReservationExpirationHandler } from '../handlers/reservation-expiration.handler';

@Injectable()
export class ReservationConsumer {
  private readonly logger = new Logger(ReservationConsumer.name);

  constructor(
    private readonly reservationCreatedHandler: ReservationCreatedHandler,
    private readonly paymentConfirmedHandler: PaymentConfirmedHandler,
    private readonly reservationExpirationHandler: ReservationExpirationHandler,
  ) {}

  @RabbitSubscribe({
    exchange: 'cinema.events',
    routingKey: 'reservation.created',
    queue: 'reservations.analytics',
    queueOptions: {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'cinema.events.dlq',
      },
    },
  })
  handleReservationCreated(event: ReservationCreatedEvent): void {
    this.logger.debug(`Received reservation.created event`);

    try {
      this.reservationCreatedHandler.handle(event);
    } catch (error) {
      this.logger.error('Error processing reservation.created', error);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cinema.events',
    routingKey: 'payment.confirmed',
    queue: 'payments.notifications',
    queueOptions: { durable: true },
  })
  handlePaymentConfirmed(event: PaymentConfirmedEvent): void {
    this.logger.debug(`Received payment.confirmed event`);

    try {
      this.paymentConfirmedHandler.handle(event);
    } catch (error) {
      this.logger.error('Error processing payment.confirmed', error);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: 'cinema.events',
    routingKey: 'reservation.expired',
    queue: 'reservations.cleanup',
    queueOptions: { durable: true },
  })
  handleReservationExpired(event: ReservationExpiredEvent): void {
    this.logger.debug(`Received reservation.expired event`);

    try {
      this.reservationExpirationHandler.handle(event);
    } catch (error) {
      this.logger.error('Error processing reservation.expired', error);
      throw error;
    }
  }
}
