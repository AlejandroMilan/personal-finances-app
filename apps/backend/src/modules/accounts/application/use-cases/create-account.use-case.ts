import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { AccountRepository, ACCOUNT_REPOSITORY } from '../ports/account.repository';
import { CreditCardRepository, CREDIT_CARD_REPOSITORY } from '../ports/credit-card.repository';

export interface CreditCardInput {
  creditLimit: number;
  usedAmount?: number;
  cutoffDate: Date;
  paymentDate: Date;
}

export interface CreateAccountInput {
  userId: string;
  name: string;
  balance: number;
  color: string;
  type: AccountType;
  creditCard?: CreditCardInput;
}

export interface CreatedAccount {
  account: Account;
  creditCard: CreditCard | null;
}

@Injectable()
export class CreateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @Inject(CREDIT_CARD_REPOSITORY) private readonly creditCardRepository: CreditCardRepository,
  ) {}

  async execute(input: CreateAccountInput): Promise<CreatedAccount> {
    if (input.type === AccountType.CREDIT && !input.creditCard) {
      throw new BadRequestException('creditCard is required for credit accounts');
    }
    if (input.type !== AccountType.CREDIT && input.creditCard) {
      throw new BadRequestException('creditCard is only allowed for credit accounts');
    }
    if (input.creditCard && this.exceedsLimit(input.creditCard)) {
      throw new BadRequestException('usedAmount cannot exceed creditLimit');
    }

    const account = Account.create({
      userId: input.userId,
      name: input.name.trim(),
      balance: input.balance,
      color: input.color,
      type: input.type,
    });
    const savedAccount = await this.accountRepository.save(account);

    let creditCard: CreditCard | null = null;
    if (input.type === AccountType.CREDIT && input.creditCard) {
      creditCard = CreditCard.create({
        accountId: savedAccount.id,
        creditLimit: input.creditCard.creditLimit,
        usedAmount: input.creditCard.usedAmount ?? 0,
        cutoffDate: input.creditCard.cutoffDate,
        paymentDate: input.creditCard.paymentDate,
      });
      await this.creditCardRepository.save(creditCard);
    }

    return { account: savedAccount, creditCard };
  }

  private exceedsLimit(card: CreditCardInput): boolean {
    return (card.usedAmount ?? 0) > card.creditLimit;
  }
}
