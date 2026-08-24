import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Budget } from '../../domain/entities/budget.entity';
import { BudgetError } from '../../domain/budget.error';
import {
  BudgetRepository,
  BUDGET_REPOSITORY,
} from '../ports/budget.repository';

export interface CreateBudgetInput {
  userId: string;
  month: string;
  items: Budget['items'];
}

@Injectable()
export class CreateBudgetUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY)
    private readonly budgetRepository: BudgetRepository,
  ) {}

  async execute(input: CreateBudgetInput): Promise<Budget> {
    const existing = await this.budgetRepository.findByMonth(
      input.userId,
      input.month,
    );
    if (existing?.userId === input.userId) {
      throw new ConflictException('Budget already exists for this month');
    }

    const budget = this.createBudget(input);

    try {
      return await this.budgetRepository.save(budget);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Budget already exists for this month');
      }
      throw error;
    }
  }

  private createBudget(input: CreateBudgetInput): Budget {
    try {
      return Budget.create({
        userId: input.userId,
        month: input.month,
        items: input.items,
      });
    } catch (error) {
      if (error instanceof BudgetError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }
}
