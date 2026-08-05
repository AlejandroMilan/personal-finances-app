import { Inject, Injectable } from '@nestjs/common';
import { Account } from '../../domain/entities/account.entity';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { AccountRepository, ACCOUNT_REPOSITORY } from '../ports/account.repository';
import { CreditCardRepository, CREDIT_CARD_REPOSITORY } from '../ports/credit-card.repository';

export interface ListedAccount {
  account: Account;
  creditCard: CreditCard | null;
}

@Injectable()
export class ListAccountsUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @Inject(CREDIT_CARD_REPOSITORY) private readonly creditCardRepository: CreditCardRepository,
  ) {}

  async execute(userId: string): Promise<ListedAccount[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    if (accounts.length === 0) {
      return [];
    }

    const cards = await this.creditCardRepository.findByAccountIds(
      accounts.map((account) => account.id),
    );
    const cardsByAccountId = new Map(cards.map((card) => [card.accountId, card]));

    return accounts.map((account) => ({
      account,
      creditCard: cardsByAccountId.get(account.id) ?? null,
    }));
  }
}
