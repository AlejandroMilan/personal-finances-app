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
import {
  DEBT_REPOSITORY,
  DebtRepository,
} from '../../../debts/application/ports/debt.repository';
import {
  buildDebtLink,
  DebtLink,
  DebtLinkRequest,
  toDebtLinkRequest,
} from '../../../transactions/domain/debt-link';
import { withTransactionErrors } from '../../../transactions/application/domain-error';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionError } from '../../domain/scheduled-transaction.error';
import {
  SCHEDULED_TRANSACTION_REPOSITORY,
  ScheduledTransactionRepository,
} from '../ports/scheduled-transaction.repository';
import {
  assertAccountOwnership,
  assertCategoryOwnership,
  assertDebtOwnership,
} from './scheduled-transaction-ownership.guard';

export interface CreateScheduledTransactionInput {
  userId: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  scheduledFor: Date;
  recurring?: boolean;
  tags?: string[];
  debtLink?: DebtLinkRequest | null;
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
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
  ) {}

  async execute(
    input: CreateScheduledTransactionInput,
  ): Promise<ScheduledTransaction> {
    await assertAccountOwnership(
      this.accountRepository,
      input.accountId,
      input.userId,
    );

    if (input.type === TransactionType.TRANSFER && input.destinationAccountId) {
      await assertAccountOwnership(
        this.accountRepository,
        input.destinationAccountId,
        input.userId,
      );
    }

    if (input.categoryId) {
      await assertCategoryOwnership(
        this.categoryRepository,
        input.categoryId,
        input.userId,
      );
    }

    const debtLink = await this.resolveDebtLink(
      input.userId,
      input.type,
      input.amount,
      input.debtLink,
    );

    let scheduled: ScheduledTransaction;
    try {
      scheduled = ScheduledTransaction.create({
        userId: input.userId,
        accountId: input.accountId,
        destinationAccountId: input.destinationAccountId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        title: input.title,
        amount: input.amount,
        tags: input.tags ?? [],
        scheduledFor: input.scheduledFor,
        recurring: input.recurring ?? false,
        debtLink,
      });
    } catch (error) {
      if (error instanceof ScheduledTransactionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.scheduledRepository.save(scheduled);
  }

  /** La deuda debe ser del usuario y el vínculo compatible con el tipo. */
  private async resolveDebtLink(
    userId: string,
    type: TransactionType,
    amount: number,
    request: DebtLinkRequest | null | undefined,
  ): Promise<DebtLink | null> {
    if (!request) {
      return null;
    }
    await assertDebtOwnership(this.debtRepository, request.debtId, userId);
    return withTransactionErrors(() => buildDebtLink(type, amount, request));
  }
}
