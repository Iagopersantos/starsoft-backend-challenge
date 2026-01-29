import { ApiProperty } from '@nestjs/swagger';
import { Seats } from '../../../database/entities/seats.entity';

export class SessionResponseDto {
  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  movieName: string;

  @ApiProperty()
  totalSeats: number;

  @ApiProperty()
  availableSeats: number;

  @ApiProperty()
  reservedSeats: number;

  @ApiProperty()
  soldSeats: number;

  @ApiProperty({ type: [Seats] })
  seats: Seats[];
}
