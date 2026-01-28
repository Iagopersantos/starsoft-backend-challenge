import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../../database/entities/reservation.entity';

@Injectable()
export class ReservationsRepository extends Repository<Reservation> {
  constructor(private readonly dataSource: DataSource) {
    super(Reservation, dataSource.createEntityManager());
  }

  async findActiveReservationsByUser(userId: string) {
    return this.find({
      where: {
        userId,
        status: ReservationStatus.PENDING,
      },
    });
  }

  async findReservationById(reservationId: string) {
    return this.findOne({
      where: {
        id: reservationId,
      },
    });
  }

  async updateReservationStatus(reservationId: string, status: ReservationStatus) {
    return this.update(reservationId, { status });
  }
}