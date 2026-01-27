import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Seats } from '../../database/entities/seats.entity';

@Injectable()
export class SeatsRepository extends Repository<Seats> {
  constructor(private readonly dataSource: DataSource) {
    super(Seats, dataSource.createEntityManager());
  }
  ''
  async findSeatsBySession(sessionId: string) {
    return this.find({
      where: { sessionId },
      order: { row: 'ASC', seatNumber: 'ASC' },
    });
  }
}