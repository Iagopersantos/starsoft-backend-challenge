import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seats } from '../../database/entities/seats.entity';
import { SeatsRepository } from './seats.repository';
import { UpdateSeatStatusDto } from './dto/update-seat-status.dto';
import { SeatStatus } from '../../database/entities/seats.entity';

@Injectable()
export class SeatsService {
  constructor(
    @InjectRepository(Seats)
    private readonly seatRepository: Repository<Seats>,
    private readonly seatsRepository: SeatsRepository,
  ) {}

  async getSeatsBySession(sessionId: string) {
    const seats = await this.seatsRepository.findSeatsBySession(sessionId);
    if (!seats || seats.length === 0) {
      throw new NotFoundException('No seats found for this session');
    }
    return seats;
  }

  async updateSeatStatus(seatId: string, updateSeatStatusDto: UpdateSeatStatusDto) {
    const seat = await this.seatRepository.findOne({ where: { id: seatId } });

    if (!seat) {
      throw new NotFoundException('Seat not found');
    }

    seat.status = updateSeatStatusDto.status as SeatStatus;
    return this.seatRepository.save(seat);
  }
}