import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan } from 'typeorm';
import { Reservation, ReservationStatus } from '../../database/entities/reservation.entity';
import { Seats, SeatStatus } from '../../database/entities/seats.entity';
import { LockService } from '../../shared/services/lock.service';
import { CacheService } from '../../shared/services/cache.service';
import { EventService } from '../../shared/services/event.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Sale } from 'src/database/entities/sale.entity';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly RESERVATION_TTL_SECONDS = 30;

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(Seats)
    private readonly seatRepository: Repository<Seats>,
    private readonly dataSource: DataSource,
    private readonly lockService: LockService,
    private readonly cacheService: CacheService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Cria uma nova reserva com proteção contra concorrência
   */
  async createReservation(dto: CreateReservationDto) {
    const { seatIds, userId, idempotencyKey } = dto;

    // 1. Verificar idempotência
    if (idempotencyKey) {
      const existing = await this.reservationRepository.findOne({
        where: { idempotencyKey, status: In([ReservationStatus.PENDING, ReservationStatus.CONFIRMED]) }
      });
      
      if (existing) {
        this.logger.log(`Idempotent request detected: ${idempotencyKey}`);
        return existing;
      }
    }

    // 2. Adquirir locks distribuídos (ordenados para prevenir deadlock)
    const lockResources = seatIds.map(id => `seat:${id}`);
    
    return await this.lockService.withMultipleLocks(
      lockResources,
      async () => {
        // 3. Iniciar transação de banco de dados
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // 4. Verificar disponibilidade dos assentos
          const seats = await queryRunner.manager.find(Seats, {
            where: { id: In(seatIds) },
            lock: { mode: 'pessimistic_write' } // Row-level lock
          });

          // Validações
          if (seats.length !== seatIds.length) {
            throw new BadRequestException('Um ou mais assentos não foram encontrados');
          }

          const unavailableSeats = seats.filter(seat => seat.status !== SeatStatus.AVAILABLE);
          if (unavailableSeats.length > 0) {
            const seatNumbers = unavailableSeats.map(s => s.seatNumber).join(', ');
            throw new ConflictException(`Assentos não disponíveis: ${seatNumbers}`);
          }

          // Verificar se todos os assentos são da mesma sessão
          const sessionIds = new Set(seats.map(s => s.sessionId));
          if (sessionIds.size > 1) {
            throw new BadRequestException('Todos os assentos devem ser da mesma sessão');
          }

          const sessionId = seats[0].sessionId;

          // 5. Atualizar status dos assentos para reservado
          await queryRunner.manager.update(
            Seats,
            { id: In(seatIds) },
            { status: SeatStatus.RESERVED }
          );

          // 6. Criar reservas
          const expiresAt = new Date(Date.now() + this.RESERVATION_TTL_SECONDS * 1000);
          const reservations: Reservation[] = [];

          for (const seat of seats) {
            const reservation = queryRunner.manager.create(Reservation, {
              seatId: seat.id,
              userId,
              status: ReservationStatus.PENDING,
              idempotencyKey: seatIds.length === 1 ? idempotencyKey : undefined,
              expiresAt,
            });
            
            const saved = await queryRunner.manager.save(reservation);
            reservations.push(saved);
          }

          // 7. Commit da transação
          await queryRunner.commitTransaction();

          // 8. Invalidar cache
          await this.cacheService.invalidateSessionCache(sessionId);

          // 9. Publicar evento de reserva criada
          await this.eventService.publishReservationCreated({
            reservationIds: reservations.map(r => r.id),
            sessionId,
            seatIds,
            userId,
            expiresAt: expiresAt.toISOString(),
          });

          this.logger.log(`Reservations created: ${reservations.map(r => r.id).join(', ')}`);

          return {
            reservations: reservations.map(r => ({
              id: r.id,
              seatId: r.seatId,
              expiresAt: r.expiresAt,
            })),
            expiresIn: this.RESERVATION_TTL_SECONDS,
            message: `Reserva(s) criada(s) com sucesso. Confirme o pagamento em ${this.RESERVATION_TTL_SECONDS} segundos.`
          };

        } catch (error) {
          // Rollback em caso de erro
          await queryRunner.rollbackTransaction();
          this.logger.error('Error creating reservation', error);
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
      10000 // Lock TTL de 10 segundos (maior que operação esperada)
    );
  }

  /**
   * Confirma pagamento e converte reserva em venda
   */
  async confirmPayment(reservationId: string, paymentMethod?: string) {
    return await this.lockService.withLock(
      `reservation:${reservationId}`,
      async () => {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // 1. Buscar reserva com lock
          const reservation = await queryRunner.manager.findOne(Reservation, {
            where: { id: reservationId },
            relations: ['seat', 'seat.session'],
            lock: { mode: 'pessimistic_write' }
          });

          if (!reservation) {
            throw new BadRequestException('Reserva não encontrada');
          }

          // 2. Validar status e expiração
          if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException(`Reserva está no status: ${reservation.status}`);
          }

          if (new Date() > reservation.expiresAt) {
            throw new BadRequestException('Reserva expirou');
          }

          // 3. Atualizar reserva para confirmada
          reservation.status = ReservationStatus.CONFIRMED;
          await queryRunner.manager.save(reservation);

          // 4. Atualizar assento para vendido
          await queryRunner.manager.update(
            Seats,
            { id: reservation.seatId },
            { status: SeatStatus.SOLD }
          );

          // 5. Criar registro de venda
          const sale = queryRunner.manager.create(Sale, {
            reservationId: reservation.id,
            seatId: reservation.seatId,
            userId: reservation.userId,
            amountPaid: reservation.seat.session.ticketPrice,
            paymentMethod: paymentMethod || 'not_specified',
          });

          await queryRunner.manager.save(sale);

          // 6. Commit
          await queryRunner.commitTransaction();

          // 7. Invalidar cache
          await this.cacheService.invalidateSessionCache(reservation.seat.sessionId);

          // 8. Publicar evento
          await this.eventService.publishPaymentConfirmed({
            reservationId: reservation.id,
            saleId: sale.id,
            seatId: reservation.seatId,
            userId: reservation.userId,
            amountPaid: sale.amountPaid,
          });

          this.logger.log(`Payment confirmed for reservation: ${reservationId}`);

          return {
            saleId: sale.id,
            reservationId: reservation.id,
            seatNumber: reservation.seat.seatNumber,
            amountPaid: sale.amountPaid,
            message: 'Pagamento confirmado com sucesso!'
          };

        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.logger.error('Error confirming payment', error);
          throw error;
        } finally {
          await queryRunner.release();
        }
      }
    );
  }

  /**
   * Expira reservas não confirmadas (chamado por cron job)
   */
  async expireReservations() {
    const expiredReservations = await this.reservationRepository.find({
      where: {
        status: ReservationStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      relations: ['seat'],
    });

    if (expiredReservations.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const reservation of expiredReservations) {
        // Atualizar reserva
        reservation.status = ReservationStatus.EXPIRED;
        await queryRunner.manager.save(reservation);

        // Liberar assento
        await queryRunner.manager.update(
          Seats,
          { id: reservation.seatId },
          { status: SeatStatus.AVAILABLE }
        );

        // Publicar evento
        await this.eventService.publishReservationExpired({
          reservationId: reservation.id,
          seatId: reservation.seatId,
          sessionId: reservation.seat.sessionId,
        });
      }

      await queryRunner.commitTransaction();
      
      this.logger.log(`Expired ${expiredReservations.length} reservations`);
      
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error expiring reservations', error);
    } finally {
      await queryRunner.release();
    }
  }
}