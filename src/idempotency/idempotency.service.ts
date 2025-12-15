import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '@novacrust-lib/core/utils/redis-cache.service';

@Injectable()
export class IdempotencyService {
  constructor(private readonly cache: RedisCacheService) {}

  async check(key: string) {
    return this.cache.get(key);
  }

  async markProcessing(key: string) {
    await this.cache.set(key, { status: 'PROCESSING' }, 60);
  }

  async markCompleted(key: string, response: any) {
    await this.cache.set(key, response, 300);
  }

  async markFailed(key: string, error: any) {
    return this.cache.set(key, { status: 'failed', error }, 3600);
  }
}
