import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountType } from '../../../accounts/domain/account-type.enum';
import { Account } from '../../../accounts/domain/entities/account.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
} from '../../../accounts/application/ports/account.repository';
import {
  CREDIT_CARD_REPOSITORY,
  CreditCardRepository,
} from '../../../accounts/application/ports/credit-card.repository';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepository,
} from '../ports/transaction.repository';

export interface DeleteTransactionInput {
  userId: string;
  transactionId: string;
}

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(CREDIT_CARD_REPOSITORY)
    private readonly creditCardRepository: CreditCardRepository,
  ) {}

  async execute(input: DeleteTransactionInput): Promise<void> {
    const transaction = await this.transactionRepository.findById(
      input.transactionId,
    );
    if (!transaction || transaction.userId !== input.userId) {
      throw new NotFoundException('Transaction not found');
    }

    const account = await this.accountRepository.findById(
      transaction.accountId,
    );
    if (!account || account.userId !== input.userId) {
      throw new NotFoundException('Account not found');
    }

    const destinationAccount = await this.findDestinationAccount(
      transaction.destinationAccountId,
      transaction.accountId,
      input.userId,
      transaction.type,
    );

    await this.revertDelta(account, transaction.getBalanceDelta());
    if (transaction.type === TransactionType.TRANSFER && destinationAccount) {
      await this.revertDelta(
        destinationAccount,
        transaction.getDestinationBalanceDelta(),
      );
    }

    await this.transactionRepository.delete(transaction.id);
  }

  private async findDestinationAccount(
    destinationAccountId: string | null,
    accountId: string,
    userId: string,
    type: TransactionType,
  ): Promise<Account | null> {
    if (type !== TransactionType.TRANSFER) {
      return null;
    }
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

    const destinationAccount =
      await this.accountRepository.findById(destinationAccountId);
    if (!destinationAccount || destinationAccount.userId !== userId) {
      throw new NotFoundException('Destination account not found');
    }

    return destinationAccount;
  }

  private async revertDelta(account: Account, delta: number): Promise<void> {
    await this.accountRepository.adjustBalance(account.id, -delta);
    if (account.type === AccountType.CREDIT) {
      await this.creditCardRepository.adjustUsedAmount(account.id, delta);
    }
  }
}
