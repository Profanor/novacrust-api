import { Injectable } from '@nestjs/common';
import { RedisCacheService } from '@novacrust-lib/core/utils/redis-cache.service';

type IdempotencyRecord<T> =
  | { status: 'PROCESSING' }
  | { status: 'FAILED'; error: any }
  | { status: 'COMPLETED'; data: T };

@Injectable()
export class IdempotencyService {
  constructor(private readonly cache: RedisCacheService) {}

  async check<T>(key: string): Promise<IdempotencyRecord<T> | null> {
    return this.cache.get(key);
  }

  async markProcessing(key: string) {
    await this.cache.set(key, { status: 'PROCESSING' }, 60);
  }

  async markCompleted<T>(key: string, data: T) {
    await this.cache.set(key, { status: 'COMPLETED', data }, 300);
  }

  async markFailed(key: string, error: any) {
    await this.cache.set(key, { status: 'FAILED', error }, 3600);
  }
}
