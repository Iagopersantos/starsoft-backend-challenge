import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm";
import { Seats } from "./seats.entity";

@Entity('sessions')
@Index(['movieName', 'sessionTime', 'room'])
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'movie_name' })
    movieName: string;

    @Column({ name: 'session_time', type: 'timestamp' })
    sessionTime: Date;

    @Column({ name: 'room' })
    room: string;

    @Column({ name: 'ticket_price', type: 'decimal', precision: 10, scale: 2 })
    ticketPrice: number;

    @OneToMany(() => Seats, seats => seats.session)
    seats: Seats[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', nullable: true })
    updatedAt: Date;
}
