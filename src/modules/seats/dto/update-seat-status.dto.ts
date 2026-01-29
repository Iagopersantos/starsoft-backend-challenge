import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSeatStatusDto {
  @ApiProperty({ example: 'reserved', enum: ['available', 'reserved', 'sold'] })
  @IsString()
  @IsIn(['available', 'reserved', 'sold'])
  status: 'available' | 'reserved' | 'sold';
}
