import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { Sale } from '../../database/entities/sale.entity';
import { Reservation } from '../../database/entities/reservation.entity';
import { Seats } from '../../database/entities/seats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, Reservation, Seats])],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService],
})
export class SalesModule {}
