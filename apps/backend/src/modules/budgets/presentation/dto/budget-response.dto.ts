import { BudgetItemType } from '../../domain/budget-item-type.enum';

export interface BudgetItemResponseDto {
  categoryId: string;
  type: BudgetItemType;
  amount: number;
  note?: string;
}

export interface BudgetResponseDto {
  id: string;
  month: string;
  items: BudgetItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
