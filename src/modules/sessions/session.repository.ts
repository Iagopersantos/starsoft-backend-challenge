import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Session } from '../../database/entities/session.entity';

@Injectable()
export class SessionRepository extends Repository<Session> {
  constructor(private readonly dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  async findSessionWithSeats(sessionId: string) {
    return this.findOne({
      where: { id: sessionId },
      relations: ['seats'],
    });
  }
}
