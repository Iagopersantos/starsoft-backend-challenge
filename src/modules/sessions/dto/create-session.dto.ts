import { IsString, IsDateString, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: 'Inception' })
  @IsString()
  movieName: string;

  @ApiProperty({ example: '2026-02-01T19:00:00Z' })
  @IsDateString()
  sessionTime: string;

  @ApiProperty({ example: 'Sala 1' })
  @IsString()
  room: string;

  @ApiProperty({ example: 25.00, minimum: 0 })
  @IsNumber()
  @IsPositive()
  ticketPrice: number;

  @ApiProperty({ example: 16, minimum: 16 })
  @IsNumber()
  @Min(16)
  totalSeats: number;
}