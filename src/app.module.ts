import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from './shared/shared.module';
import { SessionModule } from './modules/sessions/session.module';
import { SeatsModule } from './modules/seats/seats.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SalesModule } from './modules/sales/sales.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const password = configService.get<string>('DATABASE_PASSWORD');
        if (!password) {
          throw new Error('DATABASE_PASSWORD environment variable is required');
        }
        return {
          type: 'postgres',
          host: configService.get('DATABASE_HOST', 'localhost'),
          port: configService.get('DATABASE_PORT', 5432),
          username: configService.get('DATABASE_USER', 'cinema'),
          password,
          database: configService.get('DATABASE_NAME', 'cinema_db'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('NODE_ENV') !== 'production',
        };
      },
      inject: [ConfigService],
    }),
    ReservationsModule,
    SessionModule,
    SeatsModule,
    SalesModule,
    EventsModule,
  ],
})
export class AppModule {}
