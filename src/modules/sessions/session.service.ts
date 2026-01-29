import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../database/entities/session.entity';
import { Seats, SeatStatus } from '../../database/entities/seats.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { CacheService } from '../../shared/services/cache.service';

@Injectable()
export class SessionService {
  private readonly SESSION_CACHE_TTL = 10; // Cache TTL in seconds

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Seats)
    private readonly seatRepository: Repository<Seats>,
    private readonly cacheService: CacheService,
  ) {}

  async getAllSessions() {
    return this.sessionRepository.find();
  }

  async createSession(createSessionDto: CreateSessionDto) {
    const { movieName, sessionTime, room, ticketPrice, totalSeats } =
      createSessionDto;

    // Criar a sessão
    const session = this.sessionRepository.create({
      movieName,
      sessionTime,
      room,
      ticketPrice,
    });

    const savedSession = await this.sessionRepository.save(session);

    // Criar os assentos
    const seats: Seats[] = [];
    const rows = ['A', 'B', 'C', 'D']; // Exemplo de 4 filas
    const seatsPerRow = Math.ceil(totalSeats / rows.length);

    for (const row of rows) {
      for (let i = 1; i <= seatsPerRow; i++) {
        if (seats.length >= totalSeats) break;
        seats.push(
          this.seatRepository.create({
            session: savedSession,
            seatNumber: `${row}${i}`,
            row: row,
            status: SeatStatus.AVAILABLE,
          }),
        );
      }
    }

    await this.seatRepository.save(seats);

    return {
      ...savedSession,
      seats,
    };
  }

  async getSessionAvailability(sessionId: string) {
    // Verificar cache
    const cachedAvailability =
      await this.cacheService.getSessionAvailability(sessionId);
    if (cachedAvailability) {
      return cachedAvailability;
    }

    // Buscar sessão
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: ['seats'],
    });

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    // Calcular disponibilidade
    const availableSeats = session.seats.filter(
      (seat) => seat.status === SeatStatus.AVAILABLE,
    ).length;
    const reservedSeats = session.seats.filter(
      (seat) => seat.status === SeatStatus.RESERVED,
    ).length;
    const soldSeats = session.seats.filter(
      (seat) => seat.status === SeatStatus.SOLD,
    ).length;

    const availability = {
      sessionId: session.id,
      movieName: session.movieName,
      totalSeats: session.seats.length,
      availableSeats,
      reservedSeats,
      soldSeats,
      seats: session.seats,
    };

    // Cachear resultado
    await this.cacheService.cacheSessionAvailability(sessionId, availability);

    return availability;
  }
}
