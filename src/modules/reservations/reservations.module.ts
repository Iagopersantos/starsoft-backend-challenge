import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationsRepository } from './reservations.repository';
import { Reservation } from '../../database/entities/reservation.entity';
import { SeatsModule } from '../seats/seats.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation]), SeatsModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsRepository],
  exports: [ReservationsService],
})
export class ReservationsModule {}
