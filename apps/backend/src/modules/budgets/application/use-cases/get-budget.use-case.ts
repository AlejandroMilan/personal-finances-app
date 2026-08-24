import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Budget } from '../../domain/entities/budget.entity';
import {
  BudgetRepository,
  BUDGET_REPOSITORY,
} from '../ports/budget.repository';

export interface GetBudgetInput {
  userId: string;
  month: string;
}

@Injectable()
export class GetBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepository,
  ) {}

  async execute(input: GetBudgetInput): Promise<Budget> {
    const budget = await this.budgetRepository.findByMonth(
      input.userId,
      input.month,
    );
    if (!budget || budget.userId !== input.userId) {
      throw new NotFoundException('Budget not found');
    }

    return budget;
  }
}
