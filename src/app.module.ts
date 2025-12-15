import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { WalletModule } from './wallet/wallet.module';
import { RedisModule } from '@novacrust-lib/core/utils/redis-cache.module';

@Module({
  imports: [IdempotencyModule, WalletModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
