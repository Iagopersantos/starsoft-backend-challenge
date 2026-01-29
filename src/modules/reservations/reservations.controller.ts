import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiExtraModels } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import {
  CreateReservationResponseDto,
  ConfirmPaymentResponseDto,
  ReservationItemDto,
} from './dto/reservation-response.dto';
import { ApiResponses } from '../../shared/decorators/api-response.decorator';

@ApiTags('Reservations')
@ApiExtraModels(ReservationItemDto, CreateReservationResponseDto, ConfirmPaymentResponseDto)
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria uma nova reserva para assentos' })
  @ApiResponses({
    201: {
      description: 'Reserva criada com sucesso.',
      type: CreateReservationResponseDto,
    },
    400: { description: 'Dados inválidos ou assentos indisponíveis.' },
    409: { description: 'Conflito: Assentos já reservados.' },
  })
  async createReservation(
    @Body() createReservationDto: CreateReservationDto,
  ): Promise<CreateReservationResponseDto> {
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
  @ApiResponses({
    200: {
      description:
        'Pagamento confirmado com sucesso. Reserva convertida em venda.',
      type: ConfirmPaymentResponseDto,
    },
    400: {
      description:
        'Reserva não encontrada, já foi confirmada, cancelada ou expirou.',
    },
  })
  async confirmPayment(
    @Param('id') reservationId: string,
    @Body() confirmPaymentDto: ConfirmPaymentDto,
  ): Promise<ConfirmPaymentResponseDto> {
    return this.reservationsService.confirmPayment(
      reservationId,
      confirmPaymentDto.paymentMethod,
    );
  }
}
