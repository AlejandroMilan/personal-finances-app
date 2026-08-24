import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { BUDGET_LIST_MAX_LIMIT } from '../../application/budget-list-limits';
import { BUDGET_MONTH_PATTERN } from './budget-month-param.dto';

export class ListBudgetsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(BUDGET_LIST_MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsString()
  @Matches(BUDGET_MONTH_PATTERN)
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(BUDGET_MONTH_PATTERN)
  to?: string;
}
