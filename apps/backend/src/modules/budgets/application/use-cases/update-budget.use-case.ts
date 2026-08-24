import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetError } from '../../domain/budget.error';
import {
  BudgetRepository,
  BUDGET_REPOSITORY,
} from '../ports/budget.repository';

export interface UpdateBudgetInput {
  userId: string;
  month: string;
  items: Budget['items'];
}

@Injectable()
export class UpdateBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepository,
  ) {}

  async execute(input: UpdateBudgetInput): Promise<Budget> {
    const existing = await this.budgetRepository.findByMonth(
      input.userId,
      input.month,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Budget not found');
    }

    const budget = this.buildUpdatedBudget(existing, input.items);

    try {
      return await this.budgetRepository.save(budget);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Budget already exists for this month');
      }
      throw error;
    }
  }

  private buildUpdatedBudget(existing: Budget, items: Budget['items']): Budget {
    let validated: Budget;
    try {
      validated = Budget.create({
        userId: existing.userId,
        month: existing.month,
        items,
      });
    } catch (error) {
      if (error instanceof BudgetError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return Budget.restore({
      id: existing.id,
      userId: existing.userId,
      month: existing.month,
      items: validated.items,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }
}
