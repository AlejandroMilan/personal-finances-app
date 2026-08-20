import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

export interface UpdateScheduledTransactionInput {
  userId: string;
  scheduledTransactionId: string;
  accountId?: string;
  categoryId?: string | null;
  type?: TransactionType;
  title?: string;
  amount?: number;
  scheduledFor?: Date;
  recurring?: boolean;
  tags?: string[];
}

@Injectable()
export class UpdateScheduledTransactionUseCase {
  constructor(
    @Inject(SCHEDULED_TRANSACTION_REPOSITORY)
    private readonly scheduledRepository: ScheduledTransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(
    input: UpdateScheduledTransactionInput,
  ): Promise<ScheduledTransaction> {
    const existing = await this.scheduledRepository.findById(
      input.scheduledTransactionId,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Scheduled transaction not found');
    }

    if (!existing.isPending()) {
      throw new ConflictException(
        'Only a pending scheduled transaction can be edited',
      );
    }

    const accountId = input.accountId ?? existing.accountId;
    if (accountId !== existing.accountId) {
      await assertAccountOwnership(
        this.accountRepository,
        accountId,
        input.userId,
      );
    }

    const categoryId =
      input.categoryId === undefined ? existing.categoryId : input.categoryId;
    if (categoryId && categoryId !== existing.categoryId) {
      await assertCategoryOwnership(
        this.categoryRepository,
        categoryId,
        input.userId,
      );
    }

    const title = input.title?.trim() ?? existing.title;
    const amount = input.amount ?? existing.amount;
    if (title.length === 0) {
      throw new BadRequestException('Title must not be empty');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const updated = ScheduledTransaction.restore({
      id: existing.id,
      userId: existing.userId,
      accountId,
      categoryId,
      type: input.type ?? existing.type,
      title,
      amount,
      tags: input.tags
        ? input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : existing.tags,
      scheduledFor: input.scheduledFor ?? existing.scheduledFor,
      recurring: input.recurring ?? existing.recurring,
      status: existing.status,
      transactionId: existing.transactionId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    return this.scheduledRepository.save(updated);
  }
}
