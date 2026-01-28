import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({
    example: 'credit_card',
    description:
      'Método de pagamento utilizado (credit_card, debit_card, pix, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
