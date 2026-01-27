import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Seats } from './seats.entity';

@Entity('sales')
@Index(['reservationId', 'seatId', 'userId']) // Adding a composite index for reservationId, seatId, and userId to improve query performance
export class Sale {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'reservation_id', unique: true })
    @Index() // Adding an index to improve query performance
    reservationId: string;

    @ManyToOne(() => Reservation)
    @JoinColumn({ name: 'reservation_id' })
    reservation: Reservation;

    @Column({ name: 'seat_id' })
    @Index() // Adding an index to improve query performance
    seatId: string;

    @ManyToOne(() => Seats)
    @JoinColumn({ name: 'seat_id' })
    seat: Seats;

    @Column({ name: 'user_id' })
    @Index() // Adding an index to improve query performance
    userId: string;

    @Column({ name: 'amount_paid', type: 'decimal', precision: 10, scale: 2 })
    amountPaid: number;

    @Column({ name: 'payment_method', nullable: true })
    paymentMethod: string;

    @Column({ name: 'confirmed_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    confirmedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}