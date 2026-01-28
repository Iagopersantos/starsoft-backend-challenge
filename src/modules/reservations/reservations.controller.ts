import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova reserva para assentos' })
  @ApiResponse({ status: 201, description: 'Reserva criada com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou assentos indisponíveis.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflito: Assentos já reservados.',
  })
  async createReservation(@Body() createReservationDto: CreateReservationDto) {
    return this.reservationsService.createReservation(createReservationDto);
  }

  @Post(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirma o pagamento de uma reserva',
    description:
      'Converte uma reserva pendente em venda definitiva. A reserva deve estar no status PENDING e não pode estar expirada.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da reserva (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description:
      'Pagamento confirmado com sucesso. Reserva convertida em venda.',
    schema: {
      example: {
        saleId: '660e8400-e29b-41d4-a716-446655440001',
        reservationId: '550e8400-e29b-41d4-a716-446655440000',
        seatNumber: 'A1',
        amountPaid: 25.0,
        message: 'Pagamento confirmado com sucesso!',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Reserva não encontrada, já foi confirmada, cancelada ou expirou.',
    schema: {
      example: {
        statusCode: 400,
        message: 'Reserva expirou',
        error: 'Bad Request',
      },
    },
  })
  async confirmPayment(
    @Param('id') reservationId: string,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ) {
    return this.reservationsService.confirmPayment(
      reservationId,
      confirmPaymentDto.paymentMethod,
    );
  }
}
