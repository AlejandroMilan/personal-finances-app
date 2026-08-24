import { Inject, Injectable } from '@nestjs/common';
import { Budget } from '../../domain/entities/budget.entity';
import {
  BudgetFilters,
  BudgetRepository,
  BUDGET_REPOSITORY,
} from '../ports/budget.repository';

export interface ListBudgetsInput {
  userId: string;
  from?: string;
  to?: string;
  limit?: number;
}

@Injectable()
export class ListBudgetsUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepository,
  ) {}

  async execute(input: ListBudgetsInput): Promise<Budget[]> {
    const filters: BudgetFilters = {};
    if (input.from !== undefined) {
      filters.from = input.from;
    }
    if (input.to !== undefined) {
      filters.to = input.to;
    }
    if (input.limit !== undefined) {
      filters.limit = input.limit;
    }

    return this.budgetRepository.list(input.userId, filters);
  }
}
