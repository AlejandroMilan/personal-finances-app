import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';

export class ExecuteScheduledTransactionDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  accountId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  destinationAccountId?: string;

  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string | null;

  /** Pide reagendar; sin `rescheduleFor` el backend usa un mes después. */
  @IsOptional()
  @IsBoolean()
  reschedule?: boolean;

  /** Fecha exacta de la siguiente ocurrencia. */
  @IsOptional()
  @IsDateString()
  rescheduleFor?: string;
}
