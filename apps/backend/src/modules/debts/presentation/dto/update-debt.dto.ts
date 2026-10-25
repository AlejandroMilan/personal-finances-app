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

export class UpdateDebtDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  /** Corrige el saldo; genera un movimiento de tipo 'ajuste'. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsBoolean()
  revolving?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  annualInterestRate?: number | null;

  @IsOptional()
  @IsEnum(DebtPaymentMode)
  paymentMode?: DebtPaymentMode;
}
