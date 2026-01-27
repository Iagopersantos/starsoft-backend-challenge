import { Column, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Index, UpdateDateColumn, CreateDateColumn, Entity } from "typeorm";
import { Session } from "./session.entity";

export enum SeatStatus {
    AVAILABLE = 'available',
    RESERVED = 'reserved',
    SOLD = 'sold'
}

@Entity('seats')
@Index(['sessionId', 'seatNumber', 'row'])
export class Seats {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'session_id' })
    sessionId: string;

    @ManyToOne(() => Session, session => session.seats)
    @JoinColumn({ name: 'session_id' })
    session: Session;

    @Column({ name: 'seat_number' })
    seatNumber: string;

    @Column({ name: 'row', type: 'char', length: 1 })
    row: string;

    @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
    status: SeatStatus;

    @Column({ name: 'version', type: 'int', default: 1 })
    version: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
    static Status: any;
}