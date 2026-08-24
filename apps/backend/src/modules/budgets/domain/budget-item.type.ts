import { BudgetItemType } from './budget-item-type.enum';

export interface BudgetItem {
  categoryId: string;
  type: BudgetItemType;
  amount: number;
  note?: string;
}
