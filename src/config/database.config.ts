// filepath: c:\Users\Iago\workspace\estudos\starsoft-backend-challenge\src\config\database.config.ts
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'cinema',
  password: 'cinema123',
  database: 'cinema_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
