import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Session } from '../src/database/entities/session.entity';
import { Seats, SeatStatus } from '../src/database/entities/seats.entity';

dotenv.config();

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER || 'cinema',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'cinema_db',
    entities: [Session, Seats],
  });

  await dataSource.initialize();

  // Criar sessão
  const session = dataSource.manager.create(Session, {
    movieName: 'Inception',
    sessionTime: new Date('2026-02-01T19:00:00Z'),
    room: 'Sala 1',
    ticketPrice: 25.00,
  });

  await dataSource.manager.save(session);
  console.log(`Session created: ${session.id}`);

  // Criar 16 assentos (4 filas x 4 colunas)
  const rows = ['A', 'B', 'C', 'D'];
  const seatsPerRow = 4;
  const seats: Seats[] = [];

  for (const row of rows) {
    for (let num = 1; num <= seatsPerRow; num++) {
      const seat = dataSource.manager.create(Seats, {
        session: session,
        seatNumber: `${row}${num}`,
        row: row,
        status: SeatStatus.AVAILABLE, // Use the enum value
      });
      
      seats.push(seat);
    }
  }

  await dataSource.manager.save(seats);
  console.log(`Created ${seats.length} seats`);
  console.log(`Session ID: ${session.id}`);
  console.log(`Sample seat IDs: ${seats.slice(0, 3).map(s => s.id).join(', ')}`);

  await dataSource.destroy();
}

seed().catch(console.error);