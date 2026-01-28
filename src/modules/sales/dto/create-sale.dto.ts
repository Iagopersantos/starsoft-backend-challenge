import { IsUUID, IsNumber, IsString, IsOptional, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID da reserva associada à venda' })
  @IsUUID()
  reservationId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'ID do assento vendido' })
  @IsUUID()
  seatId: string;

  @ApiProperty({ example: 'user-123', description: 'ID do usuário que realizou a compra' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 50.0, description: 'Valor pago pela venda' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'credit_card', description: 'Método de pagamento utilizado', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}