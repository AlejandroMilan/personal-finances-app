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

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  timestamp?: Date;
  tags?: string[];
}

@Injectable()
export class CreateTransactionUseCase {
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

  async execute(input: CreateTransactionInput): Promise<Transaction> {
    const account = await this.accountRepository.findById(input.accountId);
    if (!account || account.userId !== input.userId) {
      throw new NotFoundException('Account not found');
    }

    const destinationAccount = await this.findDestinationAccount(input);

    if (input.categoryId) {
      await this.assertCategoryOwnership(input.categoryId, input.userId);
    }

    const transaction = Transaction.create({
      userId: input.userId,
      accountId: input.accountId,
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      title: input.title.trim(),
      amount: input.amount,
      timestamp: input.timestamp ?? new Date(),
      tags: this.cleanTags(input.tags),
    });

    await this.applyTransactionDeltas(account, destinationAccount, transaction);

    return this.transactionRepository.save(transaction);
  }

  private async findDestinationAccount(
    input: CreateTransactionInput,
  ): Promise<Account | null> {
    if (input.type !== TransactionType.TRANSFER) {
      return null;
    }

    this.assertTransferDestination(input.accountId, input.destinationAccountId);

    const destinationAccount = await this.accountRepository.findById(
      input.destinationAccountId,
    );
    if (!destinationAccount || destinationAccount.userId !== input.userId) {
      throw new NotFoundException('Destination account not found');
    }

    return destinationAccount;
  }

  private assertTransferDestination(
    accountId: string,
    destinationAccountId: string | null | undefined,
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

  private async applyTransactionDeltas(
    account: Account,
    destinationAccount: Account | null,
    transaction: Transaction,
  ): Promise<void> {
    await this.applyDelta(account, transaction.getBalanceDelta());
    if (transaction.type === TransactionType.TRANSFER && destinationAccount) {
      await this.applyDelta(
        destinationAccount,
        transaction.getDestinationBalanceDelta(),
      );
    }
  }

  private async applyDelta(account: Account, delta: number): Promise<void> {
    await this.accountRepository.adjustBalance(account.id, delta);
    if (account.type === AccountType.CREDIT) {
      await this.creditCardRepository.adjustUsedAmount(account.id, -delta);
    }
  }

  private async assertCategoryOwnership(
    categoryId: string,
    userId: string,
  ): Promise<void> {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category || category.userId !== userId) {
      throw new BadRequestException('Category not found');
    }
  }

  private cleanTags(tags: string[] | undefined): string[] {
    return (tags ?? [])
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
}
