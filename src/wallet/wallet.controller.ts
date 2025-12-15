import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { FundDto } from './dto/fund.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { CreateWalletDto } from './dto/create-wallet.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({
    status: 200,
    description: 'Wallet created successfully.',
  })
  async createWallet(@Body() body: CreateWalletDto) {
    return this.walletService.createWallet(body);
  }

  @Get('balance/:walletId')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found.',
  })
  async getWallet(@Param('walletId', ParseIntPipe) walletId: number) {
    return this.walletService.getWallet(walletId);
  }

  @Post('fund')
  @ApiOperation({ summary: 'Fund user wallet from mock source' })
  @ApiResponse({
    status: 200,
    description: 'Wallet funded successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or idempotency key missing.',
  })
  async fund(@Body() body: FundDto) {
    return this.walletService.fund(body);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer funds between wallets' })
  @ApiResponse({
    status: 200,
    description: 'Transfer completed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request, insufficient funds, or currency mismatch.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sender or recipient wallet not found.',
  })
  async transfer(@Body() body: TransferDto) {
    return this.walletService.transfer(body);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw funds from wallet' })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal completed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or insufficient funds.',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found.',
  })
  async withdraw(@Body() body: WithdrawDto) {
    return this.walletService.withdraw(body);
  }
}
