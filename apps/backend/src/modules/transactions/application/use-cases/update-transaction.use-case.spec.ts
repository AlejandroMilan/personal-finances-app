import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountType } from '../../../accounts/domain/account-type.enum';
import { Account } from '../../../accounts/domain/entities/account.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import { Transaction } from '../../domain/entities/transaction.entity';
import { UpdateTransactionUseCase } from './update-transaction.use-case';

describe('UpdateTransactionUseCase', () => {
  const transactionRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByAccountId: jest.fn(),
    clearCategoryReferences: jest.fn(),
    summarize: jest.fn(),
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
  let useCase: UpdateTransactionUseCase;

  const account = (id: string, type: AccountType) =>
    Account.restore({
      id,
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  const transaction = () =>
    Transaction.restore({
      id: 't1',
      userId: 'u1',
      accountId: 'a1',
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'Lunch',
      amount: 50,
      timestamp: new Date('2026-08-01T12:00:00.000Z'),
      tags: ['food'],
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    categoryRepository.findById.mockResolvedValue({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date(),
    });
    useCase = new UpdateTransactionUseCase(
      transactionRepository,
      accountRepository,
      creditCardRepository,
      categoryRepository,
    );
  });

  it('throws NotFoundException when the transaction does not exist', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', transactionId: 'missing', title: 'X' }),
    ).rejects.toThrow(NotFoundException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the transaction belongs to another user', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());

    await expect(
      useCase.execute({ userId: 'u2', transactionId: 't1', title: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the account belongs to another user', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(
      account('a1', AccountType.CASH),
    );

    await expect(
      useCase.execute({ userId: 'u2', transactionId: 't1', title: 'X' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when the category is not owned by the user', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(
      account('a1', AccountType.CASH),
    );
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', transactionId: 't1', categoryId: 'c9' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates fields without changing the balance when the delta is the same', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(
      account('a1', AccountType.CASH),
    );

    await useCase.execute({
      userId: 'u1',
      transactionId: 't1',
      title: 'Dinner',
    });

    expect(accountRepository.adjustBalance).not.toHaveBeenCalled();
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dinner', amount: 50 }),
    );
  });

  it('adjusts the account balance when the amount changes', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(
      account('a1', AccountType.CASH),
    );

    await useCase.execute({ userId: 'u1', transactionId: 't1', amount: 80 });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', -30);
  });

  it('reverts the old account and applies the delta to the new account when it changes', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById
      .mockResolvedValueOnce(account('a1', AccountType.CASH))
      .mockResolvedValueOnce(account('a2', AccountType.CASH));

    await useCase.execute({
      userId: 'u1',
      transactionId: 't1',
      accountId: 'a2',
    });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', 50);
    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a2', -50);
  });

  it('throws NotFoundException when the target account does not exist', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById
      .mockResolvedValueOnce(account('a1', AccountType.CASH))
      .mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ userId: 'u1', transactionId: 't1', accountId: 'a2' }),
    ).rejects.toThrow(NotFoundException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('adjusts the used amount on credit accounts', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(
      account('a1', AccountType.CREDIT),
    );

    await useCase.execute({ userId: 'u1', transactionId: 't1', amount: 100 });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', -50);
    expect(creditCardRepository.adjustUsedAmount).toHaveBeenCalledWith(
      'a1',
      50,
    );
  });

  it('reverts and applies credit adjustments when moving between accounts', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById
      .mockResolvedValueOnce(account('a1', AccountType.CREDIT))
      .mockResolvedValueOnce(account('a2', AccountType.CREDIT));

    await useCase.execute({
      userId: 'u1',
      transactionId: 't1',
      accountId: 'a2',
    });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', 50);
    expect(creditCardRepository.adjustUsedAmount).toHaveBeenCalledWith(
      'a1',
      -50,
    );
    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a2', -50);
    expect(creditCardRepository.adjustUsedAmount).toHaveBeenCalledWith(
      'a2',
      50,
    );
  });

  it('clears the category when categoryId is null', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(
      account('a1', AccountType.CASH),
    );

    await useCase.execute({
      userId: 'u1',
      transactionId: 't1',
      categoryId: null,
    });

    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null }),
    );
  });
});
