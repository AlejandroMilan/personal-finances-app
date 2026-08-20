import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';

export class ListScheduledTransactionsDto {
  @IsOptional()
  @IsEnum(ScheduledTransactionStatus)
  status?: ScheduledTransactionStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
