import { CreditCard } from '../../domain/entities/credit-card.entity';

export interface CreditCardRepository {
  findByAccountId(accountId: string): Promise<CreditCard | null>;
  findByAccountIds(accountIds: string[]): Promise<CreditCard[]>;
  save(card: CreditCard): Promise<CreditCard>;
  adjustUsedAmount(
    accountId: string,
    delta: number,
  ): Promise<CreditCard | null>;
  deleteByAccountId(accountId: string): Promise<void>;
}

export const CREDIT_CARD_REPOSITORY = 'CREDIT_CARD_REPOSITORY';
