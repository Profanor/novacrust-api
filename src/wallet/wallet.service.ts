import { PrismaService } from '@novacrust-lib/database/prisma.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '../../generated/prisma/enums';
import { IdempotencyService } from 'src/idempotency/idempotency.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { FundDto } from './dto/fund.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class WalletService {
  constructor(
    private readonly db: PrismaService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  private handleError(error: any, message: string) {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    if (error.code === 'P2025') {
      throw new NotFoundException('Wallet not found');
    }

    throw new InternalServerErrorException(message);
  }

  private async processTransaction<T>(
    dto: { idempotencyKey?: string },
    operation: () => Promise<T>,
  ): Promise<T> {
    // auto-generate idempotency key if missing (demo-friendly)
    const key = dto.idempotencyKey || randomUUID();

    const cached = await this.idempotencyService.check(key);
    if (cached) return cached as T;

    try {
      await this.idempotencyService.markProcessing(key);
      const result = await operation();
      await this.idempotencyService.markCompleted(key, result);
      return result;
    } catch (error) {
      await this.idempotencyService.markFailed(key, { message: error.message });
      this.handleError(error, 'Transaction failed');
      throw error;
    }
  }

  async createWallet(dto: CreateWalletDto) {
    return this.db.wallet.create({
      data: {
        balance: 0, // always initialized by the system
        currency: dto.currency ?? 'USD',
      },
    });
  }

  async getWallet(walletId: number) {
    const wallet = await this.db.wallet.findUnique({
      where: { id: walletId },
      include: { transactions: true },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  async fund(dto: FundDto) {
    if (dto.amount <= 0)
      throw new BadRequestException('Amount must be positive');

    return this.processTransaction(dto, async () => {
      return this.db.$transaction(async (tx) => {
        const wallet = await tx.wallet.update({
          where: { id: dto.walletId },
          data: { balance: { increment: dto.amount } },
        });

        await tx.transaction.create({
          data: {
            walletId: dto.walletId,
            amount: dto.amount,
            type: TransactionType.FUND,
          },
        });

        return {
          success: { balance: wallet.balance, currency: wallet.currency },
        };
      });
    });
  }

  async transfer(dto: TransferDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (dto.fromWalletId === dto.toWalletId)
      throw new BadRequestException('You cannot transfer to yourself');

    return this.processTransaction(dto, async () => {
      return this.db.$transaction(async (tx) => {
        const senderWallet = await tx.wallet.findUnique({
          where: { id: dto.fromWalletId },
        });
        if (!senderWallet) {
          throw new NotFoundException('Sender wallet not found');
        }

        const recipientWallet = await tx.wallet.findUnique({
          where: { id: dto.toWalletId },
        });
        if (!recipientWallet) {
          throw new NotFoundException('Recipient wallet not found');
        }

        if (senderWallet.currency !== recipientWallet.currency)
          throw new BadRequestException('Currency mismatch');

        const senderUpdate = await tx.wallet.updateMany({
          where: { id: dto.fromWalletId, balance: { gte: dto.amount } },
          data: { balance: { decrement: dto.amount } },
        });

        if (senderUpdate.count === 0)
          throw new BadRequestException('Insufficient balance');

        const updatedRecipientWallet = await tx.wallet.update({
          where: { id: dto.toWalletId },
          data: { balance: { increment: dto.amount } },
        });

        // create transaction ledgers
        await tx.transaction.createMany({
          data: [
            {
              amount: dto.amount,
              type: TransactionType.TRANSFER_OUT,
              walletId: dto.fromWalletId,
            },
            {
              amount: dto.amount,
              type: TransactionType.TRANSFER_IN,
              walletId: dto.toWalletId,
            },
          ],
        });

        const updatedSenderWallet = await tx.wallet.findUnique({
          where: { id: dto.fromWalletId },
        });

        return {
          success: {
            senderBalance: updatedSenderWallet!.balance,
            recipientBalance: updatedRecipientWallet.balance,
            currency: updatedSenderWallet!.currency,
          },
        };
      });
    });
  }

  async withdraw(dto: WithdrawDto) {
    if (dto.amount <= 0)
      throw new BadRequestException('Amount must be positive');

    return this.processTransaction(dto, async () => {
      return this.db.$transaction(async (tx) => {
        const update = await tx.wallet.updateMany({
          where: { id: dto.walletId, balance: { gte: dto.amount } },
          data: { balance: { decrement: dto.amount } },
        });

        if (update.count === 0)
          throw new BadRequestException(
            'Insufficient funds or wallet not found',
          );

        const wallet = await tx.wallet.findUnique({
          where: { id: dto.walletId },
        });
        if (!wallet) throw new NotFoundException('Wallet not found');

        await tx.transaction.create({
          data: {
            walletId: dto.walletId,
            amount: dto.amount,
            type: TransactionType.WITHDRAW,
          },
        });

        return {
          success: { balance: wallet.balance, currency: wallet.currency },
        };
      });
    });
  }
}
