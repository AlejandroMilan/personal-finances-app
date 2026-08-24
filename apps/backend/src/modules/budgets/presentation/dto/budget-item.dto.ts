import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { BudgetItemType } from '../../domain/budget-item-type.enum';

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
  note?: string;
}
