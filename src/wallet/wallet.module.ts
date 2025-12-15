import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { DatabaseModule } from '@novacrust-lib/database/database.module';
import { IdempotencyService } from 'src/idempotency/idempotency.service';

@Module({
  imports: [DatabaseModule],
  providers: [WalletService, IdempotencyService],
  controllers: [WalletController],
})
export class WalletModule {}
