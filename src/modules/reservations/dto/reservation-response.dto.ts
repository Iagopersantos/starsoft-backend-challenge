import { ApiProperty } from '@nestjs/swagger';

export class ReservationItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID da reserva',
  })
  id: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440001',
    description: 'ID do assento reservado',
  })
  seatId: string;

  @ApiProperty({
    example: '2024-01-15T10:30:30.000Z',
    description: 'Data e hora de expiração da reserva',
  })
  expiresAt: Date;
}

export class CreateReservationResponseDto {
  @ApiProperty({
    type: [ReservationItemDto],
    description: 'Lista de reservas criadas',
  })
  reservations: ReservationItemDto[];

  @ApiProperty({
    example: 30,
    description: 'Tempo em segundos até a expiração da reserva',
  })
  expiresIn: number;

  @ApiProperty({
    example:
      'Reserva(s) criada(s) com sucesso. Confirme o pagamento em 30 segundos.',
    description: 'Mensagem de confirmação',
  })
  message: string;
}

export class ConfirmPaymentResponseDto {
  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440002',
    description: 'ID da venda gerada',
  })
  saleId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID da reserva confirmada',
  })
  reservationId: string;

  @ApiProperty({
    example: 'A1',
    description: 'Número do assento',
  })
  seatNumber: string;

  @ApiProperty({
    example: 25.0,
    description: 'Valor pago pelo ingresso',
  })
  amountPaid: number;

  @ApiProperty({
    example: 'Pagamento confirmado com sucesso!',
    description: 'Mensagem de confirmação',
  })
  message: string;
}
