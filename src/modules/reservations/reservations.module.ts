import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { Reservation } from '../../database/entities/reservation.entity';
import { Seats } from '../../database/entities/seats.entity';
import { LockService } from '../../shared/services/lock.service';
import { CacheService } from '../../shared/services/cache.service';
import { EventService } from '../../shared/services/event.service';
import { ConfigService } from '@nestjs/config';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
    imports: [TypeOrmModule.forFeature([Reservation, Seats]),
    RedisModule.forRootAsync({
        useFactory: (configService: ConfigService): RedisModuleOptions => {
            const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
            const redisPort = configService.get<number>('REDIS_PORT', 6379);
            return {
                type: 'single',
                url: `redis://${redisHost}:${redisPort}`,
            };
        },
        inject: [ConfigService],
    }),
    RabbitMQModule.forRootAsync({
        useFactory: (configService: ConfigService) => {
            const rabbitUrl = configService.get<string>(
                'RABBITMQ_URL',
                'amqp://cinema:cinema123@localhost:5672'
            );
            return {
                exchanges: [
                    {
                        name: 'cinema-events',
                        type: 'topic',
                    },
                ],
                uri: rabbitUrl,
                connectionInitOptions: { wait: false },
            };
        },
        inject: [ConfigService],
    }),
    ],
    controllers: [ReservationsController],
    providers: [ReservationsService, LockService, CacheService, EventService],
    exports: [ReservationsService],
})
export class ReservationsModule { }