import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { MAX_BUDGET_ITEMS } from '../../domain/budget-limits';
import { BudgetItemDto } from './budget-item.dto';

export class UpdateBudgetDto {
  @IsArray()
  @ArrayMaxSize(MAX_BUDGET_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}
