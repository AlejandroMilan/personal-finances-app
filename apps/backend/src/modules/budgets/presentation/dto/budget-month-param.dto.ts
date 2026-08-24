import { IsString, Matches } from 'class-validator';

export const BUDGET_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class BudgetMonthParamDto {
  @IsString()
  @Matches(BUDGET_MONTH_PATTERN)
  month: string;
}
