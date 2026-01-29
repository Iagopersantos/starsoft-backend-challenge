import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { LockService } from './services/lock.service';
import { CacheService } from './services/cache.service';
import { EventService } from './services/event.service';

@Global()
@Module({
  imports: [
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
          'amqp://cinema:cinema123@localhost:5672',
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
  providers: [LockService, CacheService, EventService],
  exports: [LockService, CacheService, EventService],
})
export class SharedModule {}
