import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import type {
  ReservationCreatedEvent,
  PaymentConfirmedEvent,
  ReservationExpiredEvent,
} from '../../shared/services/event.service';

@Injectable()
export class ReservationConsumer {
  private readonly logger = new Logger(ReservationConsumer.name);

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
  async handleReservationCreated(event: ReservationCreatedEvent) {
    this.logger.log(`Processing reservation.created: ${JSON.stringify(event)}`);

    try {
      // Aqui você pode:
      // - Enviar email de confirmação
      // - Atualizar analytics
      // - Notificar sistemas externos
      // - Agendar job de expiração

      this.logger.log(`Reservation processed successfully`);
    } catch (error) {
      this.logger.error('Error processing reservation.created', error);
      throw error; // Vai para retry/DLQ
    }
  }

  @RabbitSubscribe({
    exchange: 'cinema.events',
    routingKey: 'payment.confirmed',
    queue: 'payments.notifications',
    queueOptions: { durable: true },
  })
  async handlePaymentConfirmed(event: PaymentConfirmedEvent) {
    this.logger.log(`Processing payment.confirmed: ${JSON.stringify(event)}`);

    try {
      // Aqui você pode:
      // - Enviar email com ingresso
      // - Gerar PDF do ingresso
      // - Atualizar relatórios financeiros
      // - Notificar parceiros

      this.logger.log(`Payment processed successfully`);
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
  async handleReservationExpired(event: ReservationExpiredEvent) {
    this.logger.log(`Processing reservation.expired: ${JSON.stringify(event)}`);

    try {
      // Aqui você pode:
      // - Atualizar métricas de conversão
      // - Enviar lembrete ao usuário
      // - Limpar dados temporários

      this.logger.log(`Expiration processed successfully`);
    } catch (error) {
      this.logger.error('Error processing reservation.expired', error);
      throw error;
    }
  }
}
