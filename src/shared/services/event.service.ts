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

@Injectable()
export class EventService {
    private readonly logger = new Logger(EventService.name);
    private readonly exchange = 'cinema.events';

    constructor(private readonly amqpConnection: AmqpConnection) {}

    async publishReservationCreated(event: ReservationCreatedEvent): Promise<void> {
        try {
            await this.amqpConnection.publish(this.exchange, 'reservation.created', event);
            this.logger.log(`Published reservation.created event: ${JSON.stringify(event)}`);
        } catch (error) {
            this.logger.error(`Failed to publish reservation.created event: ${error.message}`, error.stack);
            throw error;
        }
    }

    async publishPaymentConfirmed(event: PaymentConfirmedEvent): Promise<void> {
        try {
            await this.amqpConnection.publish(this.exchange, 'payment.confirmed', event);
            this.logger.log(`Published payment.confirmed event: ${JSON.stringify(event)}`);
        } catch (error) {
            this.logger.error(`Failed to publish payment.confirmed event: ${error.message}`, error.stack);
            throw error;
        }
    }

    async publishReservationExpired(event: ReservationExpiredEvent): Promise<void> {
        try {
            await this.amqpConnection.publish(this.exchange, 'reservation.expired', event);
            this.logger.log(`Published reservation.expired event: ${JSON.stringify(event)}`);
        } catch (error) {
            this.logger.error(`Failed to publish reservation.expired event: ${error.message}`, error.stack);
            throw error;
        }
    }
}