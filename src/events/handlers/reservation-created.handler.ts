import { Injectable, Logger } from '@nestjs/common';
import type { ReservationCreatedEvent } from '../../shared/services/event.service';

@Injectable()
export class ReservationCreatedHandler {
  private readonly logger = new Logger(ReservationCreatedHandler.name);

  handle(event: ReservationCreatedEvent): void {
    this.logger.log(
      `Processing reservation for session ${event.sessionId}, seats: ${event.seatIds.join(', ')}`,
    );

    // Futuras implementações:
    // - Enviar email de confirmação de reserva
    // - Atualizar analytics/métricas
    // - Notificar sistemas externos (CRM, etc)
    // - Agendar job de lembrete antes da expiração

    this.logger.log(
      `Reservation ${event.reservationIds.join(', ')} processed successfully`,
    );
  }
}
