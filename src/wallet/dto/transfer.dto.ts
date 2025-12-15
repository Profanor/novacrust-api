import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class TransferDto {
  @IsNotEmpty()
  @IsInt()
  fromWalletId: number;

  @IsNotEmpty()
  @IsInt()
  toWalletId: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  idempotencyKey: string;
}
