import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TRANSACTION_REPOSITORY,
  TransactionRepository,
} from '../../../transactions/application/ports/transaction.repository';
import {
  AccountRepository,
  ACCOUNT_REPOSITORY,
} from '../ports/account.repository';
import {
  CreditCardRepository,
  CREDIT_CARD_REPOSITORY,
} from '../ports/credit-card.repository';

export interface DeleteAccountInput {
  userId: string;
  accountId: string;
}

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accountRepository: AccountRepository,
    @Inject(CREDIT_CARD_REPOSITORY)
    private readonly creditCardRepository: CreditCardRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: DeleteAccountInput): Promise<void> {
    const account = await this.accountRepository.findById(input.accountId);
    if (!account || account.userId !== input.userId) {
      throw new NotFoundException('Account not found');
    }

    await this.transactionRepository.deleteByAccountId(
      input.userId,
      account.id,
    );
    await this.creditCardRepository.deleteByAccountId(account.id);
    await this.accountRepository.delete(account.id);
  }
}
