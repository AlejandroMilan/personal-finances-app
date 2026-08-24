import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import { MAX_BUDGET_NOTE_LENGTH } from '../../domain/budget-limits';

export class BudgetItemDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsEnum(BudgetItemType)
  type: BudgetItemType;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_BUDGET_NOTE_LENGTH)
  note?: string;
}
