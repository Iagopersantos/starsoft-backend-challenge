import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { LockService } from './services/lock.service';
import { CacheService } from './services/cache.service';
import { EventService } from './services/event.service';
import { redisModuleAsyncOptions } from '../config/redis.config';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync(redisModuleAsyncOptions),
    RabbitMQModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const rabbitUrl = configService.get<string>('RABBITMQ_URL');
        if (!rabbitUrl) {
          throw new Error('RABBITMQ_URL environment variable is required');
        }
        return {
          exchanges: [
            {
              name: 'cinema.events',
              type: 'topic',
              options: { durable: true },
            },
          ],
          uri: rabbitUrl,
          connectionInitOptions: { wait: false },
          enableControllerDiscovery: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [LockService, CacheService, EventService],
  exports: [LockService, CacheService, EventService],
})
export class SharedModule {}
