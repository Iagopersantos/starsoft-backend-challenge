import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { SeatsService } from './seats.service';
import { UpdateSeatStatusDto } from './dto/update-seat-status.dto';

@Controller('seats')
export class SeatsController {
  constructor(private readonly seatsService: SeatsService) {}

  @Get(':sessionId')
  async getSeatsBySession(@Param('sessionId') sessionId: string) {
    return this.seatsService.getSeatsBySession(sessionId);
  }

  @Patch(':seatId/status')
  async updateSeatStatus(
    @Param('seatId') seatId: string,
    @Body() updateSeatStatusDto: UpdateSeatStatusDto,
  ) {
    return this.seatsService.updateSeatStatus(seatId, updateSeatStatusDto);
  }
}
