import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionRepository } from './session.repository';
import { Session } from '../../database/entities/session.entity';
import { Seats } from '../../database/entities/seats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, Seats])],
  controllers: [SessionController],
  providers: [SessionService, SessionRepository],
  exports: [SessionService, SessionRepository],
})
export class SessionModule {}
