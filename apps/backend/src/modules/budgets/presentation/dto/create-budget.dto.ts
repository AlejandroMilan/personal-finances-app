import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { MAX_BUDGET_ITEMS } from '../../domain/budget-limits';
import { BUDGET_MONTH_PATTERN } from './budget-month-param.dto';
import { BudgetItemDto } from './budget-item.dto';

export class CreateBudgetDto {
  @IsString()
  @Matches(BUDGET_MONTH_PATTERN)
  month: string;

  @IsArray()
  @ArrayMaxSize(MAX_BUDGET_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}
