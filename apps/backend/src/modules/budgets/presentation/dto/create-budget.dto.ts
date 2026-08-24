import { Type } from 'class-transformer';
import { IsArray, IsString, Matches, ValidateNested } from 'class-validator';
import { BUDGET_MONTH_PATTERN } from './budget-month-param.dto';
import { BudgetItemDto } from './budget-item.dto';

export class CreateBudgetDto {
  @IsString()
  @Matches(BUDGET_MONTH_PATTERN)
  month: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}
