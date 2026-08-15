import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType } from '../../../accounts/domain/account-type.enum';
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

    const delta = transaction.getBalanceDelta();
    await this.accountRepository.adjustBalance(account.id, -delta);
    if (account.type === AccountType.CREDIT) {
      await this.creditCardRepository.adjustUsedAmount(account.id, delta);
    }

    await this.transactionRepository.delete(transaction.id);
  }
}
