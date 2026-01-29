import { Injectable } from '@nestjs/common';
import { DataSource, Repository, In, LessThan, EntityManager } from 'typeorm';
import {
  Reservation,
  ReservationStatus,
} from '../../database/entities/reservation.entity';

@Injectable()
export class ReservationsRepository extends Repository<Reservation> {
  constructor(private readonly dataSource: DataSource) {
    super(Reservation, dataSource.createEntityManager());
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<Reservation | null> {
    return this.findOne({
      where: { idempotencyKey },
    });
  }

  async findActiveByUser(userId: string): Promise<Reservation[]> {
    return this.find({
      where: {
        userId,
        status: ReservationStatus.PENDING,
      },
      relations: ['seat', 'seat.session'],
    });
  }

  async findByIdWithRelations(
    reservationId: string,
  ): Promise<Reservation | null> {
    return this.findOne({
      where: { id: reservationId },
      relations: ['seat', 'seat.session'],
    });
  }

  async findExpiredPending(): Promise<Reservation[]> {
    return this.find({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      relations: ['seat'],
    });
  }

  async findByIdWithLock(
    reservationId: string,
    manager: EntityManager,
  ): Promise<Reservation | null> {
    // Usar QueryBuilder com INNER JOIN para evitar erro do PostgreSQL
    // "FOR UPDATE cannot be applied to the nullable side of an outer join"
    return manager
      .createQueryBuilder(Reservation, 'reservation')
      .innerJoinAndSelect('reservation.seat', 'seat')
      .innerJoinAndSelect('seat.session', 'session')
      .where('reservation.id = :id', { id: reservationId })
      .setLock('pessimistic_write')
      .getOne();
  }

  async updateStatus(
    reservationId: string,
    status: ReservationStatus,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Reservation) : this;
    await repo.update(reservationId, { status });
  }

  async createReservation(
    data: Partial<Reservation>,
    manager: EntityManager,
  ): Promise<Reservation> {
    const reservation = manager.create(Reservation, data);
    return manager.save(reservation);
  }
}
