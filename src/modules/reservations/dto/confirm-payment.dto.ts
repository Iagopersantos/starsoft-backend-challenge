import { IsUUID, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  reservationId: string;

  @ApiProperty({ example: 'credit_card', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}