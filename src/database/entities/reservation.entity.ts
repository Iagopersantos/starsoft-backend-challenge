import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Seats } from './seats.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('reservations')
@Index(['seatId', 'userId'])
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seat_id' })
  @Index()
  seatId: string;

  @ManyToOne(() => Seats)
  @JoinColumn({ name: 'seat_id' })
  seat: Seats;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.PENDING,
  })
  status: ReservationStatus;

  @Column({ name: 'idempotency_key', unique: true, nullable: true })
  @Index()
  idempotencyKey: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
