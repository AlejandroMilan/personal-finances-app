import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '../../../accounts/domain/account-type.enum';
import { Account } from '../../../accounts/domain/entities/account.entity';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../../accounts/application/ports/account.repository';
import {
  CREDIT_CARD_REPOSITORY,
  CreditCardRepository,
} from '../../../accounts/application/ports/credit-card.repository';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from '../../../categories/application/ports/category.repository';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepository,
} from '../ports/transaction.repository';

export interface UpdateTransactionInput {
  userId: string;
  transactionId: string;
  accountId?: string;
  categoryId?: string | null;
  type?: TransactionType;
  title?: string;
  amount?: number;
  timestamp?: Date;
  tags?: string[];
}

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(CREDIT_CARD_REPOSITORY)
    private readonly creditCardRepository: CreditCardRepository,
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: UpdateTransactionInput): Promise<Transaction> {
    const existing = await this.transactionRepository.findById(
      input.transactionId,
    );
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Transaction not found');
    }

    const accountId = input.accountId ?? existing.accountId;
    const categoryId =
      input.categoryId === undefined ? existing.categoryId : input.categoryId;

    const oldAccount = await this.accountRepository.findById(
      existing.accountId,
    );
    if (!oldAccount || oldAccount.userId !== input.userId) {
      throw new NotFoundException('Account not found');
    }

    let newAccount = oldAccount;
    if (accountId !== existing.accountId) {
      const target = await this.accountRepository.findById(accountId);
      if (!target || target.userId !== input.userId) {
        throw new NotFoundException('Account not found');
      }
      newAccount = target;
    }

    if (categoryId) {
      const category = await this.categoryRepository.findById(categoryId);
      if (!category || category.userId !== input.userId) {
        throw new BadRequestException('Category not found');
      }
    }

    const updated = Transaction.restore({
      id: existing.id,
      userId: existing.userId,
      accountId,
      categoryId,
      type: input.type ?? existing.type,
      title: input.title?.trim() ?? existing.title,
      amount: input.amount ?? existing.amount,
      timestamp: input.timestamp ?? existing.timestamp,
      tags: input.tags
        ? input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : existing.tags,
      createdAt: existing.createdAt,
    });

    const oldDelta = existing.getBalanceDelta();
    const newDelta = updated.getBalanceDelta();

    if (accountId === existing.accountId) {
      const delta = newDelta - oldDelta;
      if (delta !== 0) {
        await this.accountRepository.adjustBalance(accountId, delta);
        if (oldAccount.type === AccountType.CREDIT) {
          await this.creditCardRepository.adjustUsedAmount(accountId, -delta);
        }
      }
    } else {
      await this.revertDelta(oldAccount, oldDelta);
      await this.applyDelta(newAccount, newDelta);
    }

    return this.transactionRepository.save(updated);
  }

  private async applyDelta(account: Account, delta: number): Promise<void> {
    await this.accountRepository.adjustBalance(account.id, delta);
    if (account.type === AccountType.CREDIT) {
      await this.creditCardRepository.adjustUsedAmount(account.id, -delta);
    }
  }

  private async revertDelta(account: Account, delta: number): Promise<void> {
    await this.accountRepository.adjustBalance(account.id, -delta);
    if (account.type === AccountType.CREDIT) {
      await this.creditCardRepository.adjustUsedAmount(account.id, delta);
    }
  }
}
