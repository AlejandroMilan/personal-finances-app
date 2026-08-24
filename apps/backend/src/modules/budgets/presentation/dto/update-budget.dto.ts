import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { BudgetItemDto } from './budget-item.dto';

export class UpdateBudgetDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}
