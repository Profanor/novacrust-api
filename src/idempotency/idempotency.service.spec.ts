import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { RedisCacheService } from '@novacrust-lib/core/utils/redis-cache.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  const mockRedisCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
        { provide: RedisCacheService, useValue: mockRedisCacheService },
      ],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
