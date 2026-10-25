import { DebtLinkDto } from '../../../transactions/presentation/dto/debt-link.dto';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';

export class CreateScheduledTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  destinationAccountId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string;

  @IsDateString()
  scheduledFor: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => DebtLinkDto)
  debtLink?: DebtLinkDto | null;
}
