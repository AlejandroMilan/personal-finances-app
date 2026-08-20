import {
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

  @ValidateIf((_, value) => value !== null)
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  categoryId?: string | null;

  /** Fecha de la siguiente ocurrencia; sin ella no se reagenda nada. */
  @IsOptional()
  @IsDateString()
  rescheduleFor?: string;
}
