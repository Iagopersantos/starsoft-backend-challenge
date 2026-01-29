import { Injectable } from '@nestjs/common';
import { DataSource, Repository, In, EntityManager } from 'typeorm';
import { Seats, SeatStatus } from '../../database/entities/seats.entity';

@Injectable()
export class SeatsRepository extends Repository<Seats> {
  constructor(private readonly dataSource: DataSource) {
    super(Seats, dataSource.createEntityManager());
  }

  async findSeatsBySession(sessionId: string): Promise<Seats[]> {
    return this.find({
      where: { sessionId },
      order: { row: 'ASC', seatNumber: 'ASC' },
    });
  }

  async findByIdsWithLock(
    seatIds: string[],
    manager: EntityManager,
  ): Promise<Seats[]> {
    return manager.find(Seats, {
      where: { id: In(seatIds) },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async updateStatus(
    seatIds: string[],
    status: SeatStatus,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(Seats, { id: In(seatIds) }, { status });
  }

  async updateSingleStatus(
    seatId: string,
    status: SeatStatus,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(Seats, { id: seatId }, { status });
  }
}
