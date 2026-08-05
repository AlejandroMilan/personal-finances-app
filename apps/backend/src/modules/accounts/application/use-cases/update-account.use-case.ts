import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { CreditCard, CreditCardProps } from '../../domain/entities/credit-card.entity';
import { AccountRepository, ACCOUNT_REPOSITORY } from '../ports/account.repository';
import { CreditCardRepository, CREDIT_CARD_REPOSITORY } from '../ports/credit-card.repository';
import { CreditCardInput } from './create-account.use-case';

export interface UpdateAccountInput {
  userId: string;
  accountId: string;
  name?: string;
  balance?: number;
  color?: string;
  type?: AccountType;
  creditCard?: Partial<CreditCardInput>;
}

export interface UpdatedAccount {
  account: Account;
  creditCard: CreditCard | null;
}

@Injectable()
export class UpdateAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: AccountRepository,
    @Inject(CREDIT_CARD_REPOSITORY) private readonly creditCardRepository: CreditCardRepository,
  ) {}

  async execute(input: UpdateAccountInput): Promise<UpdatedAccount> {
    const existing = await this.accountRepository.findById(input.accountId);
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Account not found');
    }

    const targetType = input.type ?? existing.type;
    if (targetType !== AccountType.CREDIT && input.creditCard) {
      throw new BadRequestException('creditCard is only allowed for credit accounts');
    }

    const account = Account.restore({
      id: existing.id,
      userId: existing.userId,
      name: input.name ?? existing.name,
      balance: input.balance ?? existing.balance,
      color: input.color ?? existing.color,
      type: targetType,
      createdAt: existing.createdAt,
    });

    let creditCard: CreditCard | null = null;
    let balance = account.balance;

    if (targetType === AccountType.CREDIT) {
      const existingCard = await this.creditCardRepository.findByAccountId(account.id);

      if (existingCard) {
        const merged = this.mergeCard(existingCard, input.creditCard ?? {});
        creditCard = CreditCard.restore(merged);
      } else {
        const cardInput = input.creditCard;
        if (
          !cardInput ||
          cardInput.creditLimit === undefined ||
          cardInput.cutoffDate === undefined ||
          cardInput.paymentDate === undefined
        ) {
          throw new BadRequestException(
            'creditLimit, cutoffDate and paymentDate are required to create a credit card',
          );
        }
        creditCard = CreditCard.create({
          accountId: account.id,
          creditLimit: cardInput.creditLimit,
          usedAmount: cardInput.usedAmount ?? 0,
          cutoffDate: cardInput.cutoffDate,
          paymentDate: cardInput.paymentDate,
        });
      }
      balance = creditCard.creditLimit - creditCard.usedAmount;
      await this.creditCardRepository.save(creditCard);
    } else if (existing.type === AccountType.CREDIT) {
      await this.creditCardRepository.deleteByAccountId(account.id);
    }

    const savedAccount = await this.accountRepository.save(
      Account.restore({
        id: account.id,
        userId: account.userId,
        name: account.name,
        balance,
        color: account.color,
        type: account.type,
        createdAt: account.createdAt,
      }),
    );
    return { account: savedAccount, creditCard };
  }

  private mergeCard(
    existing: CreditCard,
    input: Partial<CreditCardInput>,
  ): CreditCardProps {
    return {
      id: existing.id,
      accountId: existing.accountId,
      creditLimit: input.creditLimit ?? existing.creditLimit,
      usedAmount: input.usedAmount ?? existing.usedAmount,
      cutoffDate: input.cutoffDate ?? existing.cutoffDate,
      paymentDate: input.paymentDate ?? existing.paymentDate,
    };
  }
}
