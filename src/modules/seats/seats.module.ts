import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatsController } from './seats.controller';
import { SeatsService } from './seats.service';
import { SeatsRepository } from './seats.repository';
import { Seats } from '../../database/entities/seats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Seats])],
  controllers: [SeatsController],
  providers: [SeatsService, SeatsRepository],
  exports: [SeatsService, SeatsRepository],
})
export class SeatsModule {}
