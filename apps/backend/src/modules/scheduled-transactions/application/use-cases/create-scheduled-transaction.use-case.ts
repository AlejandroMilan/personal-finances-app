import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../../accounts/application/ports/account.repository';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../../categories/application/ports/category.repository';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionError } from '../../domain/scheduled-transaction.error';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../ports/scheduled-transaction.repository';
import {
  assertAccountOwnership,
  assertCategoryOwnership,
} from './scheduled-transaction-ownership.guard';

export interface CreateScheduledTransactionInput {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  scheduledFor: Date;
  recurring?: boolean;
  tags?: string[];
}

@Injectable()
export class CreateScheduledTransactionUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(
    input: CreateScheduledTransactionInput,
  ): Promise<ScheduledTransaction> {
    await assertAccountOwnership(
      this.accountRepository,
      input.accountId,
      input.userId,
    );

    if (input.categoryId) {
      await assertCategoryOwnership(
        this.categoryRepository,
        input.categoryId,
        input.userId,
      );
    }

    let scheduled: ScheduledTransaction;
    try {
      scheduled = ScheduledTransaction.create({
        userId: input.userId,
        accountId: input.accountId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        title: input.title,
        amount: input.amount,
        tags: input.tags ?? [],
        scheduledFor: input.scheduledFor,
        recurring: input.recurring ?? false,
      });
    } catch (error) {
      if (error instanceof ScheduledTransactionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.scheduledRepository.save(scheduled);
  }
}
