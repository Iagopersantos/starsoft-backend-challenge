import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { ReservationStatus } from '../../database/entities/reservation.entity';
import { SeatStatus } from '../../database/entities/seats.entity';
import { Sale } from '../../database/entities/sale.entity';
import { ReservationsRepository } from './reservations.repository';
import { SeatsRepository } from '../seats/seats.repository';
import { LockService } from '../../shared/services/lock.service';
import { CacheService } from '../../shared/services/cache.service';
import { EventService } from '../../shared/services/event.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import {
  CreateReservationResponseDto,
  ConfirmPaymentResponseDto,
} from './dto/reservation-response.dto';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly reservationTtlSeconds: number;
  private readonly lockTtlMs: number;

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly seatsRepository: SeatsRepository,
    private readonly dataSource: DataSource,
    private readonly lockService: LockService,
    private readonly cacheService: CacheService,
    private readonly eventService: EventService,
    private readonly configService: ConfigService,
  ) {
    this.reservationTtlSeconds = Number(
      this.configService.get('RESERVATION_TTL_SECONDS', 30),
    );
    this.lockTtlMs = Number(this.configService.get('LOCK_TTL_MS', 10000));
  }

  /**
   * Cria uma nova reserva com proteção contra concorrência
   */
  async createReservation(
    dto: CreateReservationDto,
  ): Promise<CreateReservationResponseDto> {
    const { seatIds, userId, idempotencyKey } = dto;

    // 1. Verificar idempotência
    let expiredReservationId: string | null = null;

    if (idempotencyKey) {
      const existing =
        await this.reservationsRepository.findByIdempotencyKey(idempotencyKey);

      if (existing) {
        // Se já foi confirmada, retorna a reserva existente
        if (existing.status === ReservationStatus.CONFIRMED) {
          this.logger.log(
            `Idempotent request - reservation already confirmed: ${idempotencyKey}`,
          );
          return {
            reservations: [
              {
                id: existing.id,
                seatId: existing.seatId,
                expiresAt: existing.expiresAt,
              },
            ],
            expiresIn: 0,
            message: 'Reserva já confirmada anteriormente.',
          };
        }

        // Se está pendente e NÃO expirou, retorna a reserva existente
        if (
          existing.status === ReservationStatus.PENDING &&
          new Date() < existing.expiresAt
        ) {
          this.logger.log(
            `Idempotent request - pending reservation found: ${idempotencyKey}`,
          );
          return {
            reservations: [
              {
                id: existing.id,
                seatId: existing.seatId,
                expiresAt: existing.expiresAt,
              },
            ],
            expiresIn: Math.max(
              0,
              Math.floor((existing.expiresAt.getTime() - Date.now()) / 1000),
            ),
            message: 'Reserva pendente retornada (idempotência).',
          };
        }

        // Se expirou ou foi cancelada, guarda o ID para limpar o idempotencyKey
        this.logger.log(
          `Previous reservation expired/cancelled, allowing new reservation: ${idempotencyKey}`,
        );
        expiredReservationId = existing.id;
      }
    }

    // 2. Adquirir locks distribuídos (ordenados para prevenir deadlock)
    const lockResources = seatIds.map((id) => `seat:${id}`);

    return await this.lockService.withMultipleLocks(
      lockResources,
      async () => {
        // 3. Iniciar transação de banco de dados
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // 4. Verificar disponibilidade dos assentos com lock pessimista
          const seats = await this.seatsRepository.findByIdsWithLock(
            seatIds,
            queryRunner.manager,
          );

          // Validações
          if (seats.length !== seatIds.length) {
            throw new BadRequestException(
              'Um ou mais assentos não foram encontrados',
            );
          }

          const unavailableSeats = seats.filter(
            (seat) => seat.status !== SeatStatus.AVAILABLE,
          );
          if (unavailableSeats.length > 0) {
            const seatNumbers = unavailableSeats
              .map((s) => s.seatNumber)
              .join(', ');
            throw new ConflictException(
              `Assentos não disponíveis: ${seatNumbers}`,
            );
          }

          // Verificar se todos os assentos são da mesma sessão
          const sessionIds = new Set(seats.map((s) => s.sessionId));
          if (sessionIds.size > 1) {
            throw new BadRequestException(
              'Todos os assentos devem ser da mesma sessão',
            );
          }

          const sessionId = seats[0].sessionId;

          // 5. Atualizar status dos assentos para reservado
          await this.seatsRepository.updateStatus(
            seatIds,
            SeatStatus.RESERVED,
            queryRunner.manager,
          );

          // 5.1. Limpar idempotencyKey de reserva expirada (se existir)
          if (expiredReservationId) {
            await queryRunner.manager.update(
              'reservations',
              { id: expiredReservationId },
              { idempotencyKey: null },
            );
            this.logger.log(
              `Cleared idempotencyKey from expired reservation: ${expiredReservationId}`,
            );
          }

          // 6. Criar reservas
          const expiresAt = new Date(
            Date.now() + this.reservationTtlSeconds * 1000,
          );
          const reservations: {
            id: string;
            seatId: string;
            expiresAt: Date;
          }[] = [];

          for (const seat of seats) {
            const reservation =
              await this.reservationsRepository.createReservation(
                {
                  seatId: seat.id,
                  userId,
                  status: ReservationStatus.PENDING,
                  idempotencyKey:
                    seatIds.length === 1 ? idempotencyKey : undefined,
                  expiresAt,
                },
                queryRunner.manager,
              );
            reservations.push(reservation);
          }

          // 7. Commit da transação
          await queryRunner.commitTransaction();

          // 8. Invalidar cache
          await this.cacheService.invalidateSessionCache(sessionId);

          // 9. Publicar evento de reserva criada
          await this.eventService.publishReservationCreated({
            reservationIds: reservations.map((r) => r.id),
            sessionId,
            seatIds,
            userId,
            expiresAt: expiresAt.toISOString(),
          });

          this.logger.log(
            `Reservations created: ${reservations.map((r) => r.id).join(', ')}`,
          );

          return {
            reservations: reservations.map((r) => ({
              id: r.id,
              seatId: r.seatId,
              expiresAt: r.expiresAt,
            })),
            expiresIn: this.reservationTtlSeconds,
            message: `Reserva(s) criada(s) com sucesso. Confirme o pagamento em ${this.reservationTtlSeconds} segundos.`,
          };
        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.logger.error('Error creating reservation', error);
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
      this.lockTtlMs,
    );
  }

  /**
   * Confirma pagamento e converte reserva em venda
   */
  async confirmPayment(
    reservationId: string,
    paymentMethod?: string,
  ): Promise<ConfirmPaymentResponseDto> {
    return await this.lockService.withLock(
      `reservation:${reservationId}`,
      async () => {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          // 1. Buscar reserva com lock
          const reservation =
            await this.reservationsRepository.findByIdWithLock(
              reservationId,
              queryRunner.manager,
            );

          if (!reservation) {
            throw new BadRequestException('Reserva não encontrada');
          }

          // 2. Validar status e expiração
          if (reservation.status !== ReservationStatus.PENDING) {
            throw new BadRequestException(
              `Reserva está no status: ${reservation.status}`,
            );
          }

          if (new Date() > reservation.expiresAt) {
            throw new BadRequestException('Reserva expirou');
          }

          // 3. Atualizar reserva para confirmada
          await this.reservationsRepository.updateStatus(
            reservationId,
            ReservationStatus.CONFIRMED,
            queryRunner.manager,
          );

          // 4. Atualizar assento para vendido
          await this.seatsRepository.updateSingleStatus(
            reservation.seatId,
            SeatStatus.SOLD,
            queryRunner.manager,
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
          await this.cacheService.invalidateSessionCache(
            reservation.seat.sessionId,
          );

          // 8. Publicar evento
          await this.eventService.publishPaymentConfirmed({
            reservationId: reservation.id,
            saleId: sale.id,
            seatId: reservation.seatId,
            userId: reservation.userId,
            amountPaid: sale.amountPaid,
          });

          this.logger.log(
            `Payment confirmed for reservation: ${reservationId}`,
          );

          return {
            saleId: sale.id,
            reservationId: reservation.id,
            seatNumber: reservation.seat.seatNumber,
            amountPaid: sale.amountPaid,
            message: 'Pagamento confirmado com sucesso!',
          };
        } catch (error) {
          await queryRunner.rollbackTransaction();
          this.logger.error('Error confirming payment', error);
          throw error;
        } finally {
          await queryRunner.release();
        }
      },
    );
  }

  /**
   * Expira reservas não confirmadas
   * Executa a cada 10 segundos para garantir expiração próxima ao TTL de 30s
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async expireReservations(): Promise<void> {
    const expiredReservations =
      await this.reservationsRepository.findExpiredPending();

    if (expiredReservations.length === 0) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const reservation of expiredReservations) {
        // Atualizar reserva
        await this.reservationsRepository.updateStatus(
          reservation.id,
          ReservationStatus.EXPIRED,
          queryRunner.manager,
        );

        // Liberar assento
        await this.seatsRepository.updateSingleStatus(
          reservation.seatId,
          SeatStatus.AVAILABLE,
          queryRunner.manager,
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
