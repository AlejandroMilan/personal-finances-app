export type BudgetItemType = 'income' | 'expense';

export interface BudgetItem {
  categoryId: string;
  type: BudgetItemType;
  amount: number;
  note?: string;
}

export interface Budget {
  id: string;
  month: string;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BudgetFilters {
  from?: string;
  to?: string;
  limit?: number;
}

export interface CreateBudgetPayload {
  month: string;
  items: BudgetItem[];
}

export interface UpdateBudgetPayload {
  items: BudgetItem[];
}
