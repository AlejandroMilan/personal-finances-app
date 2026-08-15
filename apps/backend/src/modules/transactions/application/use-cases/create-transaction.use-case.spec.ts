import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountType } from '../../../accounts/domain/account-type.enum';
import { Account } from '../../../accounts/domain/entities/account.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import { CreateTransactionUseCase } from './create-transaction.use-case';

describe('CreateTransactionUseCase', () => {
  const transactionRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByAccountId: jest.fn(),
    clearCategoryReferences: jest.fn(),
  };
  const accountRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    adjustBalance: jest.fn(),
    delete: jest.fn(),
  };
  const creditCardRepository = {
    findByAccountId: jest.fn(),
    findByAccountIds: jest.fn(),
    save: jest.fn(),
    adjustUsedAmount: jest.fn(),
    deleteByAccountId: jest.fn(),
  };
  const categoryRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  let useCase: CreateTransactionUseCase;

  const account = (type: AccountType) =>
    Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateTransactionUseCase(
      transactionRepository,
      accountRepository,
      creditCardRepository,
      categoryRepository,
    );
  });

  it('throws NotFoundException when the account does not exist', async () => {
    accountRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'u1',
        accountId: 'missing',
        type: TransactionType.EXPENSE,
        title: 'Lunch',
        amount: 10,
      }),
    ).rejects.toThrow(NotFoundException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the account belongs to another user', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));

    await expect(
      useCase.execute({
        userId: 'u2',
        accountId: 'a1',
        type: TransactionType.EXPENSE,
        title: 'Lunch',
        amount: 10,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when the category belongs to another user', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: 'u1',
        accountId: 'a1',
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title: 'Lunch',
        amount: 10,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates an expense decreasing the account balance', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));
    const saved = { id: 't1' };
    transactionRepository.save.mockResolvedValue(saved);

    const result = await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      type: TransactionType.EXPENSE,
      title: '  Lunch  ',
      amount: 50,
      tags: [' food ', ''],
    });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', -50);
    expect(creditCardRepository.adjustUsedAmount).not.toHaveBeenCalled();
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        title: 'Lunch',
        amount: 50,
        tags: ['food'],
        categoryId: null,
      }),
    );
    expect(result).toBe(saved);
  });

  it('creates an income increasing the account balance', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));

    await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      type: TransactionType.INCOME,
      title: 'Salary',
      amount: 1000,
    });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', 1000);
  });

  it('creates an expense on a credit account adjusting the used amount', async () => {
    accountRepository.findById.mockResolvedValue(account(AccountType.CREDIT));

    await useCase.execute({
      userId: 'u1',
      accountId: 'a1',
      type: TransactionType.EXPENSE,
      title: 'Shopping',
      amount: 200,
    });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', -200);
    expect(creditCardRepository.adjustUsedAmount).toHaveBeenCalledWith(
      'a1',
      200,
    );
  });
});
