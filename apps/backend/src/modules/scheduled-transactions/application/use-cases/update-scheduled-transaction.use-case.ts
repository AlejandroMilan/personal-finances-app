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

export interface UpdateScheduledTransactionInput {
  userId: string;
  scheduledTransactionId: string;
  accountId?: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  type?: TransactionType;
  title?: string;
  amount?: number;
  scheduledFor?: Date;
  recurring?: boolean;
  tags?: string[];
  debtLink?: DebtLinkRequest | null;
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
    @Inject(DEBT_REPOSITORY)
    private readonly debtRepository: DebtRepository,
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
    const type = input.type ?? existing.type;
    const destinationAccountId =
      input.destinationAccountId === undefined
        ? existing.destinationAccountId
        : input.destinationAccountId;

    this.assertDestination(accountId, type, destinationAccountId);

    if (accountId !== existing.accountId) {
      await assertAccountOwnership(
        this.accountRepository,
        accountId,
        input.userId,
      );
    }

    if (
      destinationAccountId &&
      destinationAccountId !== existing.destinationAccountId
    ) {
      await assertAccountOwnership(
        this.accountRepository,
        destinationAccountId,
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

    const debtLink = await this.resolveDebtLink(input, type, amount, existing);

    const updated = ScheduledTransaction.restore({
      id: existing.id,
      userId: existing.userId,
      accountId,
      destinationAccountId,
      categoryId,
      type,
      title,
      amount,
      tags: input.tags
        ? input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : existing.tags,
      scheduledFor: input.scheduledFor ?? existing.scheduledFor,
      recurring: input.recurring ?? existing.recurring,
      status: existing.status,
      transactionId: existing.transactionId,
      debtLink,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    return this.scheduledRepository.save(updated);
  }

  /** Un vínculo sin cambios se recalcula sobre el nuevo monto; `null` lo quita. */
  private async resolveDebtLink(
    input: UpdateScheduledTransactionInput,
    type: TransactionType,
    amount: number,
    existing: ScheduledTransaction,
  ): Promise<DebtLink | null> {
    const request =
      input.debtLink === undefined && existing.debtLink
        ? toDebtLinkRequest(existing.debtLink)
        : input.debtLink;
    if (!request) {
      return null;
    }
    await assertDebtOwnership(
      this.debtRepository,
      request.debtId,
      input.userId,
    );
    return withTransactionErrors(() => buildDebtLink(type, amount, request));
  }

  private assertDestination(
    accountId: string,
    type: TransactionType,
    destinationAccountId: string | null,
  ): void {
    try {
      ScheduledTransaction.assertDestination({
        accountId,
        type,
        destinationAccountId,
      });
    } catch (error) {
      if (error instanceof ScheduledTransactionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
