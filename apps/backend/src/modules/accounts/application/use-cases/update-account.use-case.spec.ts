import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { AccountRepository } from '../ports/account.repository';
import { CreditCardRepository } from '../ports/credit-card.repository';
import { UpdateAccountUseCase } from './update-account.use-case';

describe('UpdateAccountUseCase', () => {
  const accountRepository = { findById: jest.fn(), findByUserId: jest.fn(), save: jest.fn(), delete: jest.fn() };
  const creditCardRepository = { findByAccountId: jest.fn(), findByAccountIds: jest.fn(), save: jest.fn(), deleteByAccountId: jest.fn() };
  let useCase: UpdateAccountUseCase;

  const account = (type: AccountType) =>
    Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type,
      createdAt: new Date('2026-01-01'),
    });

  const card = () =>
    CreditCard.restore({
      id: 'c1',
      accountId: 'a1',
      creditLimit: 5000,
      usedAmount: 1000,
      cutoffDate: new Date('2026-08-15'),
      paymentDate: new Date('2026-09-05'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateAccountUseCase(
      accountRepository as unknown as AccountRepository,
      creditCardRepository as unknown as CreditCardRepository,
    );
  });

  it('throws NotFoundException when the account does not exist', async () => {
    accountRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', accountId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
    expect(accountRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the account belongs to another user', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));

    await expect(
      useCase.execute({ userId: 'u2', accountId: 'a1', name: 'Hacked' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates account fields', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));
    accountRepository.save.mockImplementation((a: Account) => Promise.resolve(a));

    const result = await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      name: 'New name',
      balance: 250,
      color: '#000000',
    });

    expect(accountRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New name', balance: 250, color: '#000000' }),
    );
    expect(result.account.name).toBe('New name');
    expect(result.creditCard).toBeNull();
  });

  it('updates an existing credit card', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CREDIT));
    accountRepository.save.mockImplementation((a: Account) => Promise.resolve(a));
    creditCardRepository.findByAccountId.mockResolvedValue(card());
    creditCardRepository.save.mockImplementation((c: CreditCard) => Promise.resolve(c));

    const result = await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      creditCard: { creditLimit: 8000, usedAmount: 200 },
    });

    const savedCard = creditCardRepository.save.mock.calls[0][0] as CreditCard;
    expect(savedCard.creditLimit).toBe(8000);
    expect(savedCard.usedAmount).toBe(200);
    expect(savedCard.cutoffDate).toEqual(new Date('2026-08-15'));
    expect(result.creditCard?.creditLimit).toBe(8000);
  });

  it('converts a cash account into a credit account creating the card', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));
    accountRepository.save.mockImplementation((a: Account) => Promise.resolve(a));
    creditCardRepository.findByAccountId.mockResolvedValue(null);

    await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      type: AccountType.CREDIT,
      creditCard: {
        creditLimit: 3000,
        cutoffDate: new Date('2026-08-15'),
        paymentDate: new Date('2026-09-05'),
      },
    });

    const savedCard = creditCardRepository.save.mock.calls[0][0] as CreditCard;
    expect(savedCard.accountId).toBe('a1');
    expect(savedCard.creditLimit).toBe(3000);
  });

  it('throws when converting to credit without card details', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));
    creditCardRepository.findByAccountId.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', accountId: 'a1', type: AccountType.CREDIT }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deletes the card when converting a credit account into cash', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CREDIT));
    accountRepository.save.mockImplementation((a: Account) => Promise.resolve(a));

    const result = await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      type: AccountType.CASH,
    });

    expect(creditCardRepository.deleteByAccountId).toHaveBeenCalledWith('a1');
    expect(result.creditCard).toBeNull();
  });

  it('throws when providing a card for a non-credit account', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));

    await expect(
      useCase.execute({
        userId: 'u1',
        accountId: 'a1',
        creditCard: { creditLimit: 1000 },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when the merged card exceeds the credit limit', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CREDIT));
    creditCardRepository.findByAccountId.mockResolvedValue(card());

    await expect(
      useCase.execute({
        userId: 'u1',
        accountId: 'a1',
        creditCard: { usedAmount: 6000 },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(creditCardRepository.save).not.toHaveBeenCalled();
  });
});
