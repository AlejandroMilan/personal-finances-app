import { Budget } from '../../domain/entities/budget.entity';

export interface BudgetFilters {
  from?: string;
  to?: string;
}

export interface BudgetRepository {
  findByMonth(userId: string, month: string): Promise<Budget | null>;
  list(userId: string, filters: BudgetFilters): Promise<Budget[]>;
  save(budget: Budget): Promise<Budget>;
  deleteByMonth(userId: string, month: string): Promise<void>;
}

export const BUDGET_REPOSITORY = 'BUDGET_REPOSITORY';
