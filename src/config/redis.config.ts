import { RedisModuleOptions } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';

export const getRedisConfig = (
  configService: ConfigService,
): RedisModuleOptions => {
  const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
  const redisPort = configService.get<number>('REDIS_PORT', 6379);

  return {
    type: 'single',
    url: `redis://${redisHost}:${redisPort}`,
  };
};

export const redisModuleAsyncOptions = {
  useFactory: (configService: ConfigService): RedisModuleOptions =>
    getRedisConfig(configService),
  inject: [ConfigService],
};
