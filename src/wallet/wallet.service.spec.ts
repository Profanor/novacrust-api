/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/only-throw-error */

import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '@novacrust-lib/database/prisma.service';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: PrismaService;
  let idempotency: IdempotencyService;

  const mockWallet = {
    id: 1,
    balance: 1000,
    currency: 'NGN',
    userId: 1,
  };

  const mockPrisma = {
    wallet: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    transaction: { create: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockIdempotencyService = {
    check: jest.fn(),
    markCompleted: jest.fn(),
    markProcessing: jest.fn(),
    markFailed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
    idempotency = module.get<IdempotencyService>(IdempotencyService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // -------------------------------
  // Wallet balance
  // -------------------------------
  describe('getUserWalletBalance', () => {
    it('should throw if wallet not found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      await expect(service.getWallet(1)).rejects.toThrow(NotFoundException);
    });

    it('should return wallet balance if found', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      const result = await service.getWallet(1);
      expect(result).toEqual({
        balance: mockWallet.balance,
        currency: mockWallet.currency,
      });
    });
  });

  // -------------------------------
  // Fund wallet
  // -------------------------------
  describe('fund', () => {
    it('should throw if amount is non-positive', async () => {
      await expect(
        service.fund({ walletId: 1, amount: 0, idempotencyKey: 'key' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if wallet not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        throw { code: 'P2025' };
      });
      await expect(
        service.fund({ walletId: 1, amount: 100, idempotencyKey: 'key' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fund wallet successfully', async () => {
      mockIdempotencyService.check.mockResolvedValue(null); // force actual transaction
      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
      mockPrisma.wallet.update.mockResolvedValue({
        ...mockWallet,
        balance: 1500,
      });
      mockPrisma.transaction.create.mockResolvedValue({});
      mockIdempotencyService.markCompleted.mockResolvedValue(undefined);

      const result = await service.fund({
        walletId: 1,
        amount: 500,
        idempotencyKey: 'key',
      });
      expect(result.success).toEqual({ balance: 1500, currency: 'NGN' });
    });

    it('should not double fund if idempotency key exists', async () => {
      mockIdempotencyService.check.mockResolvedValue({
        status: 'COMPLETED',
        data: {
          success: {
            balance: mockWallet.balance,
            currency: mockWallet.currency,
          },
        },
      });

      const result = await service.fund({
        walletId: 1,
        amount: 500,
        idempotencyKey: 'key',
      });
      expect(result.success).toEqual({
        balance: mockWallet.balance,
        currency: mockWallet.currency,
      });
      expect(mockPrisma.wallet.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------
  // Transfer
  // -------------------------------
  describe('transfer', () => {
    it('should throw if fromWalletId equals toWalletId', async () => {
      await expect(
        service.transfer({
          fromWalletId: 1,
          toWalletId: 1,
          amount: 100,
          idempotencyKey: 'key',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if recipient not found', async () => {
      mockIdempotencyService.check.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
      mockPrisma.wallet.findUnique
        .mockResolvedValueOnce({ ...mockWallet }) // sender
        .mockResolvedValueOnce(null); // recipient

      await expect(
        service.transfer({
          fromWalletId: 1,
          toWalletId: 2,
          amount: 100,
          idempotencyKey: 'key',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if insufficient funds', async () => {
      mockIdempotencyService.check.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.transfer({
          fromWalletId: 1,
          toWalletId: 2,
          amount: 2000,
          idempotencyKey: 'key',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should transfer successfully', async () => {
      mockIdempotencyService.check.mockResolvedValue(false);

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        // inside the transaction, call the function with a modified prisma
        const prismaTx = {
          ...mockPrisma,
          wallet: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce({ ...mockWallet, balance: 1000 }) // sender before
              .mockResolvedValueOnce({ ...mockWallet, balance: 1200 }), // recipient after
            update: jest.fn().mockImplementation(({ where, data }) => {
              if (where.id === 1)
                return Promise.resolve({ ...mockWallet, balance: 800 });
              if (where.id === 2)
                return Promise.resolve({ ...mockWallet, balance: 1200 });
              return Promise.resolve(null);
            }),
            updateMany: mockPrisma.wallet.updateMany,
          },
          transaction: mockPrisma.transaction,
        };
        return fn(prismaTx);
      });

      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.transfer({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 200,
        idempotencyKey: 'key',
      });

      expect(result.success).toEqual({
        senderBalance: 800,
        recipientBalance: 1200,
        currency: 'NGN',
      });
    });

    it('should not double transfer if idempotency key exists', async () => {
      mockIdempotencyService.check.mockResolvedValue({
        status: 'COMPLETED',
        data: {
          success: {
            senderBalance: 1000,
            recipientBalance: 1000,
            currency: 'NGN',
          },
        },
      });

      const result = await service.transfer({
        fromWalletId: 1,
        toWalletId: 2,
        amount: 200,
        idempotencyKey: 'key',
      });
      expect(result.success).toEqual({
        senderBalance: 1000,
        recipientBalance: 1000,
        currency: 'NGN',
      });
      expect(mockPrisma.wallet.updateMany).not.toHaveBeenCalled();
    });
  });

  // -------------------------------
  // Withdraw
  // -------------------------------
  describe('withdraw', () => {
    it('should throw if amount is non-positive', async () => {
      await expect(
        service.withdraw({ walletId: 1, amount: 0, idempotencyKey: 'key' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if wallet not found or insufficient funds', async () => {
      mockIdempotencyService.check.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
      mockPrisma.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.withdraw({ walletId: 1, amount: 2000, idempotencyKey: 'key' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should withdraw successfully', async () => {
      mockIdempotencyService.check.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
      mockPrisma.wallet.findUnique.mockResolvedValue({
        ...mockWallet,
        balance: 800,
      });
      mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.transaction.create.mockResolvedValue({});

      const result = await service.withdraw({
        walletId: 1,
        amount: 200,
        idempotencyKey: 'key',
      });
      expect(result.success).toEqual({ balance: 800, currency: 'NGN' });
    });

    it('should not double withdraw if idempotency key exists', async () => {
      mockIdempotencyService.check.mockResolvedValue({
        status: 'COMPLETED',
        data: { success: { balance: mockWallet.balance, currency: 'NGN' } },
      });

      const result = await service.withdraw({
        walletId: 1,
        amount: 200,
        idempotencyKey: 'key',
      });
      expect(result.success).toEqual({
        balance: mockWallet.balance,
        currency: 'NGN',
      });
      expect(mockPrisma.wallet.updateMany).not.toHaveBeenCalled();
    });
  });
});
