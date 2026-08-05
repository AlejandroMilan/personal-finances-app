import { BadRequestException } from '@nestjs/common';
import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { AccountRepository } from '../ports/account.repository';
import { CreditCardRepository } from '../ports/credit-card.repository';
import { CreateAccountUseCase } from './create-account.use-case';

describe('CreateAccountUseCase', () => {
  const accountRepository = { findById: jest.fn(), findByUserId: jest.fn(), save: jest.fn(), delete: jest.fn() };
  const creditCardRepository = { findByAccountId: jest.fn(), findByAccountIds: jest.fn(), save: jest.fn(), deleteByAccountId: jest.fn() };
  let useCase: CreateAccountUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateAccountUseCase(
      accountRepository as unknown as AccountRepository,
      creditCardRepository as unknown as CreditCardRepository,
    );
  });

  it('creates a non-credit account without a card', async () => {
    const account = Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Cash',
      balance: 50,
      color: '#2E6B4F',
      type: AccountType.CASH,
      createdAt: new Date(),
    });
    accountRepository.save.mockResolvedValue(account);

    const result = await useCase.execute({
      userId: 'u1',
      name: ' Cash ',
      balance: 50,
      color: '#2E6B4F',
      type: AccountType.CASH,
    });

    expect(accountRepository.save).toHaveBeenCalledTimes(1);
    expect(creditCardRepository.save).not.toHaveBeenCalled();
    expect(result.account).toBe(account);
    expect(result.creditCard).toBeNull();
  });

  it('creates a credit account with its credit card', async () => {
    const account = Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Credit',
      balance: 0,
      color: '#D9C5A0',
      type: AccountType.CREDIT,
      createdAt: new Date(),
    });
    accountRepository.save.mockResolvedValue(account);

    const result = await useCase.execute({
      userId: 'u1',
      name: 'Credit',
      balance: 0,
      color: '#D9C5A0',
      type: AccountType.CREDIT,
      creditCard: {
        creditLimit: 5000,
        cutoffDate: new Date('2026-08-15'),
        paymentDate: new Date('2026-09-05'),
      },
    });

    expect(creditCardRepository.save).toHaveBeenCalledTimes(1);
    const savedCard = creditCardRepository.save.mock.calls[0][0] as CreditCard;
    expect(savedCard.accountId).toBe('a1');
    expect(savedCard.creditLimit).toBe(5000);
    expect(savedCard.usedAmount).toBe(0);
    expect(result.creditCard).toBe(savedCard);
  });

  it('throws when a credit account has no card', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        name: 'Credit',
        balance: 0,
        color: '#D9C5A0',
        type: AccountType.CREDIT,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(accountRepository.save).not.toHaveBeenCalled();
  });

  it('throws when a non-credit account has a card', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        name: 'Cash',
        balance: 0,
        color: '#2E6B4F',
        type: AccountType.CASH,
        creditCard: {
          creditLimit: 5000,
          cutoffDate: new Date(),
          paymentDate: new Date(),
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when usedAmount exceeds creditLimit', async () => {
    await expect(
      useCase.execute({
        userId: 'u1',
        name: 'Credit',
        balance: 0,
        color: '#D9C5A0',
        type: AccountType.CREDIT,
        creditCard: {
          creditLimit: 1000,
          usedAmount: 1500,
          cutoffDate: new Date(),
          paymentDate: new Date(),
        },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(accountRepository.save).not.toHaveBeenCalled();
  });
});
