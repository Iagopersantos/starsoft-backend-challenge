import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import { Sale } from '../../database/entities/sale.entity';
import { Reservation } from '../../database/entities/reservation.entity';
import { Seats } from '../../database/entities/seats.entity';
import { EventService } from '../../shared/services/event.service';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
    imports: [TypeOrmModule.forFeature([Sale, Reservation, Seats]),
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
    })
    ],
    controllers: [SalesController],
    providers: [SalesService, SalesRepository, EventService],
    exports: [SalesService],
})
export class SalesModule { }