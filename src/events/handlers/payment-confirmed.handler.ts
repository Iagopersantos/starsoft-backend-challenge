import { Injectable, Logger } from '@nestjs/common';
import type { PaymentConfirmedEvent } from '../../shared/services/event.service';

@Injectable()
export class PaymentConfirmedHandler {
  private readonly logger = new Logger(PaymentConfirmedHandler.name);

  handle(event: PaymentConfirmedEvent): void {
    this.logger.log(
      `Processing payment confirmation for reservation ${event.reservationId}`,
    );

    // Futuras implementações:
    // - Enviar email com ingresso/QR Code
    // - Gerar PDF do ingresso
    // - Atualizar relatórios financeiros
    // - Notificar parceiros/integrações
    // - Enviar push notification

    this.logger.log(
      `Payment for sale ${event.saleId} (R$ ${event.amountPaid}) processed successfully`,
    );
  }
}
