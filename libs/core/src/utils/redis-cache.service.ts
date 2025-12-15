import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { envVariables } from '../config/env';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  onModuleInit() {
    this.client = new Redis({
      host: envVariables.REDIS.host,
      port: envVariables.REDIS.port,
      password: envVariables.REDIS.password,
      db: envVariables.REDIS.db,
      retryStrategy(times) {
        return Math.min(times * 100, 2000);
      },
    });

    this.client.on('connect', () => {
      console.log('🟢 Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('[Redis]', err.message);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client?.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any, ttlSeconds?: number) {
    const data = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, data, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  async del(key: string) {
    await this.client?.del(key);
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }
}
