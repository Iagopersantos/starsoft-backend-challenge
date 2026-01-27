import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from "typeorm";
import { Seats } from "./seats.entity";

@Entity('sessions')
@Index(['movieName', 'sessionTime', 'room']) // Adding a composite index for movieName, sessionTime, and room to improve query performance
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'movie_name' })
    @Index() // Adding an index to improve query performance
    movieName: string;

    @Column({ name: 'session_time', type: 'timestamp' })
    @Index() // Adding an index to improve query performance
    sessionTime: Date;

    @Column({ name: 'room' })
    @Index() // Adding an index to improve query performance
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
