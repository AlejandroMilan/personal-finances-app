import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';

export class CreateDebtDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsBoolean()
  revolving: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  annualInterestRate?: number | null;

  @IsOptional()
  @IsEnum(DebtPaymentMode)
  paymentMode?: DebtPaymentMode;
}
