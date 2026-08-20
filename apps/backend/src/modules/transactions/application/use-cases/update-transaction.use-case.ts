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

interface BalanceAdjustment {
  account: Account;
  delta: number;
}

export interface UpdateTransactionInput {
  userId: string;
  transactionId: string;
  accountId?: string;
  destinationAccountId?: string | null;
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
    const type = input.type ?? existing.type;
    const destinationAccountId =
      input.destinationAccountId === undefined
        ? existing.destinationAccountId
        : input.destinationAccountId;
    this.assertDestination(type, accountId, destinationAccountId);

    const accounts = new Map<string, Account>();
    const oldAccount = await this.findOwnedAccount(
      existing.accountId,
      input.userId,
      accounts,
    );
    const oldDestinationAccount =
      existing.type === TransactionType.TRANSFER
        ? await this.findTransferDestination(
            existing.accountId,
            existing.destinationAccountId,
            input.userId,
            accounts,
          )
        : null;
    const newAccount = await this.findOwnedAccount(
      accountId,
      input.userId,
      accounts,
    );
    const newDestinationAccount =
      type === TransactionType.TRANSFER
        ? await this.findTransferDestination(
            accountId,
            destinationAccountId,
            input.userId,
            accounts,
          )
        : null;

    const categoryId =
      input.categoryId === undefined ? existing.categoryId : input.categoryId;

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
      destinationAccountId,
      categoryId,
      type,
      title: input.title?.trim() ?? existing.title,
      amount: input.amount ?? existing.amount,
      timestamp: input.timestamp ?? existing.timestamp,
      tags: input.tags
        ? input.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
        : existing.tags,
      createdAt: existing.createdAt,
    });

    const adjustments = new Map<string, BalanceAdjustment>();
    this.addTransactionAdjustments(
      adjustments,
      existing,
      oldAccount,
      oldDestinationAccount,
      -1,
    );
    this.addTransactionAdjustments(
      adjustments,
      updated,
      newAccount,
      newDestinationAccount,
      1,
    );
    await this.applyAdjustments(adjustments);

    return this.transactionRepository.save(updated);
  }

  private assertDestination(
    type: TransactionType,
    accountId: string,
    destinationAccountId: string | null,
  ): void {
    if (type === TransactionType.TRANSFER) {
      this.assertTransferDestination(accountId, destinationAccountId);
      return;
    }

    if (destinationAccountId !== null) {
      throw new BadRequestException(
        'Only transfer transactions can have a destination account',
      );
    }
  }

  private assertTransferDestination(
    accountId: string,
    destinationAccountId: string | null,
  ): asserts destinationAccountId is string {
    if (!destinationAccountId) {
      throw new BadRequestException(
        'Transfer transactions require a destination account',
      );
    }
    if (destinationAccountId === accountId) {
      throw new BadRequestException(
        'Transfer source and destination accounts must differ',
      );
    }
  }

  private async findOwnedAccount(
    accountId: string,
    userId: string,
    accounts: Map<string, Account>,
  ): Promise<Account> {
    const cached = accounts.get(accountId);
    if (cached) {
      return cached;
    }

    const account = await this.accountRepository.findById(accountId);
    if (!account || account.userId !== userId) {
      throw new NotFoundException('Account not found');
    }

    accounts.set(accountId, account);
    return account;
  }

  private async findTransferDestination(
    accountId: string,
    destinationAccountId: string | null,
    userId: string,
    accounts: Map<string, Account>,
  ): Promise<Account> {
    this.assertTransferDestination(accountId, destinationAccountId);
    const destinationAccount = await this.findOwnedAccount(
      destinationAccountId,
      userId,
      accounts,
    );
    return destinationAccount;
  }

  private addTransactionAdjustments(
    adjustments: Map<string, BalanceAdjustment>,
    transaction: Transaction,
    account: Account,
    destinationAccount: Account | null,
    multiplier: number,
  ): void {
    this.addAdjustment(
      adjustments,
      account,
      transaction.getBalanceDelta() * multiplier,
    );
    if (transaction.type === TransactionType.TRANSFER && destinationAccount) {
      this.addAdjustment(
        adjustments,
        destinationAccount,
        transaction.getDestinationBalanceDelta() * multiplier,
      );
    }
  }

  private addAdjustment(
    adjustments: Map<string, BalanceAdjustment>,
    account: Account,
    delta: number,
  ): void {
    const current = adjustments.get(account.id);
    if (current) {
      current.delta += delta;
      return;
    }

    adjustments.set(account.id, { account, delta });
  }

  private async applyAdjustments(
    adjustments: Map<string, BalanceAdjustment>,
  ): Promise<void> {
    for (const adjustment of adjustments.values()) {
      if (adjustment.delta !== 0) {
        await this.applyDelta(adjustment.account, adjustment.delta);
      }
    }
  }

  private async applyDelta(account: Account, delta: number): Promise<void> {
    await this.accountRepository.adjustBalance(account.id, delta);
    if (account.type === AccountType.CREDIT) {
      await this.creditCardRepository.adjustUsedAmount(account.id, -delta);
    }
  }
}
