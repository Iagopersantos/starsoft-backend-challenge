import { Column, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";
import { Session } from "./session.entity";

export enum SeatStatus {
    AVAILABLE = 'available',
    RESERVED = 'reserved',
    SOLD = 'sold'
}

@Index(['sessionId', 'seatNumber', 'row']) // Adding a composite index for sessionId, seatNumber, and row to improve query performance
export class Seats {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'session_id' })
    @Index() // Adding an index to improve query performance
    sessionId: string;

    @ManyToOne(() => Session, session => session.seats)
    @JoinColumn({ name: 'session_id' })
    session: Session;

    @Column({ name: 'seat_number' })
    @Index() // Adding an index to improve query performance
    seatNumber: string;

    @Column({ name: 'row', type: 'char', length: 1 })
    @Index() // Adding an index to improve query performance
    row: string;

    @Column({ type: 'enum', enum: SeatStatus, default: SeatStatus.AVAILABLE })
    status: SeatStatus;

    @Column({ name: 'version', type: 'int', default: 1 })
    version: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}