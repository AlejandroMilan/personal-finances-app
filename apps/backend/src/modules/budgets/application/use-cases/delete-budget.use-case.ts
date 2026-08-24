import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetRepository,
  BUDGET_REPOSITORY,
} from '../ports/budget.repository';

export interface DeleteBudgetInput {
  userId: string;
  month: string;
}

@Injectable()
export class DeleteBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepository,
  ) {}

  async execute(input: DeleteBudgetInput): Promise<void> {
    const existing = await this.budgetRepository.findByMonth(
      input.userId,
      input.month,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Budget not found');
    }

    await this.budgetRepository.deleteByMonth(input.userId, input.month);
  }
}
