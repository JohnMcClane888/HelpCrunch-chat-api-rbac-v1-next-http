import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_URL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
