import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransaction } from '../../../scheduled-transactions/domain/entities/scheduled-transaction.entity';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../../../scheduled-transactions/application/ports/scheduled-transaction.repository';
import { ScheduledTransactionStatus } from '../../../scheduled-transactions/domain/scheduled-transaction-status.enum';
import { BudgetError } from '../../domain/budget.error';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import type { BudgetItem } from '../../domain/budget-item.type';
import {
  MAX_BUDGET_ITEMS,
  MAX_BUDGET_NOTE_LENGTH,
} from '../../domain/budget-limits';
import { Budget } from '../../domain/entities/budget.entity';

export interface GetBudgetTemplateInput {
  userId: string;
  month: string;
}

interface BudgetTemplateGroup {
  categoryId: string;
  type: BudgetItemType;
  amount: number;
  titles: string[];
}

interface MonthRange {
  start: Date;
  end: Date;
}

@Injectable()
export class GetBudgetTemplateUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
  ) {}

  async execute(input: GetBudgetTemplateInput): Promise<BudgetItem[]> {
    this.assertMonth(input.month);

    const range = this.monthRange(input.month);
    const scheduled = await this.scheduledRepository.findByUserId(
      input.userId,
      {
        status: ScheduledTransactionStatus.PENDING,
        to: range.end,
        limit: MAX_BUDGET_ITEMS + 1,
      },
    );

    this.assertScheduledBounds(scheduled);

    const groups = new Map<string, BudgetTemplateGroup>();
    for (const transaction of scheduled) {
      if (!this.shouldInclude(transaction, input.userId, range)) {
        continue;
      }

      const type = this.toBudgetItemType(transaction.type);
      if (!type || !transaction.categoryId) {
        continue;
      }

      this.addToGroup(groups, transaction, type);
    }

    if (groups.size > MAX_BUDGET_ITEMS) {
      throw new BadRequestException(
        `A budget template cannot contain more than ${MAX_BUDGET_ITEMS} items`,
      );
    }

    return Array.from(groups.values()).map((group) => this.toBudgetItem(group));
  }

  private assertMonth(month: string): void {
    try {
      Budget.assertMonth(month);
    } catch (error) {
      if (error instanceof BudgetError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private monthRange(month: string): MonthRange {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setTime(end.getTime() - 1);
    return { start, end };
  }

  private shouldInclude(
    transaction: ScheduledTransaction,
    userId: string,
    range: MonthRange,
  ): boolean {
    if (
      transaction.userId !== userId ||
      transaction.status !== ScheduledTransactionStatus.PENDING ||
      transaction.type === TransactionType.TRANSFER
    ) {
      return false;
    }

    return (
      (transaction.scheduledFor >= range.start &&
        transaction.scheduledFor <= range.end) ||
      (transaction.recurring && transaction.scheduledFor < range.start)
    );
  }

  private toBudgetItemType(type: TransactionType): BudgetItemType | null {
    if (type === TransactionType.INCOME) {
      return BudgetItemType.INCOME;
    }
    if (type === TransactionType.EXPENSE) {
      return BudgetItemType.EXPENSE;
    }
    return null;
  }

  private addToGroup(
    groups: Map<string, BudgetTemplateGroup>,
    transaction: ScheduledTransaction,
    type: BudgetItemType,
  ): void {
    const categoryId = transaction.categoryId;
    if (!categoryId) {
      return;
    }

    const key = `${categoryId}:${type}`;
    const current = groups.get(key);
    const nextAmount = current
      ? current.amount + transaction.amount
      : transaction.amount;

    if (!Number.isFinite(nextAmount)) {
      throw new BadRequestException(
        'A budget template amount must remain finite',
      );
    }

    if (current) {
      current.amount = nextAmount;
      current.titles.push(transaction.title);
      return;
    }

    groups.set(key, {
      categoryId,
      type,
      amount: nextAmount,
      titles: [transaction.title],
    });
  }

  private assertScheduledBounds(scheduled: ScheduledTransaction[]): void {
    if (scheduled.length > MAX_BUDGET_ITEMS) {
      throw new BadRequestException(
        `A budget template cannot contain more than ${MAX_BUDGET_ITEMS} items`,
      );
    }
  }

  private toBudgetItem(group: BudgetTemplateGroup): BudgetItem {
    const note = `${group.titles.join(', ')} (agenda)`;
    if (note.length > MAX_BUDGET_NOTE_LENGTH) {
      throw new BadRequestException(
        `A budget template note cannot exceed ${MAX_BUDGET_NOTE_LENGTH} characters`,
      );
    }

    return {
      categoryId: group.categoryId,
      type: group.type,
      amount: group.amount,
      note,
    };
  }
}
