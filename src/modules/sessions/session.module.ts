import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { SessionRepository } from './session.repository';
import { Session } from '../../database/entities/session.entity';
import { Seats } from '../../database/entities/seats.entity';
import { CacheService } from '../../shared/services/cache.service';
import { LockService } from '../../shared/services/lock.service';
import { EventService } from '../../shared/services/event.service';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Seats]),
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
  controllers: [SessionController],
  providers: [SessionService, SessionRepository, CacheService, LockService, EventService],
  exports: [SessionService, SessionRepository],
})
export class SessionModule { }