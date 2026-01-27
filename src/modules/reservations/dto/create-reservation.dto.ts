import { IsArray, IsUUID, IsString, ArrayMinSize, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ 
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Array of seat IDs to reserve'
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  seatIds: string[];

  @ApiProperty({ example: 'user-123' })
  @IsString()
  userId: string;

  @ApiProperty({ 
    example: 'unique-key-123',
    description: 'Optional idempotency key for duplicate request protection',
    required: false
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}