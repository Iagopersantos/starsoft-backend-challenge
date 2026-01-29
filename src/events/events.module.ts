import { Module } from '@nestjs/common';
import { ReservationConsumer } from './consumers/reservation.consumer';
import { ReservationCreatedHandler } from './handlers/reservation-created.handler';
import { PaymentConfirmedHandler } from './handlers/payment-confirmed.handler';
import { ReservationExpirationHandler } from './handlers/reservation-expiration.handler';

@Module({
  providers: [
    ReservationConsumer,
    ReservationCreatedHandler,
    PaymentConfirmedHandler,
    ReservationExpirationHandler,
  ],
  exports: [
    ReservationCreatedHandler,
    PaymentConfirmedHandler,
    ReservationExpirationHandler,
  ],
})
export class EventsModule {}
