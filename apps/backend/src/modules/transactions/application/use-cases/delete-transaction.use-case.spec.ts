import { NotFoundException } from '@nestjs/common';
import { AccountType } from '../../../accounts/domain/account-type.enum';
import { Account } from '../../../accounts/domain/entities/account.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import { Transaction } from '../../domain/entities/transaction.entity';
import { DeleteTransactionUseCase } from './delete-transaction.use-case';

describe('DeleteTransactionUseCase', () => {
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
  let useCase: DeleteTransactionUseCase;

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

  const transaction = () =>
    Transaction.restore({
      id: 't1',
      userId: 'u1',
      accountId: 'a1',
      categoryId: null,
      type: TransactionType.EXPENSE,
      title: 'Lunch',
      amount: 50,
      timestamp: new Date('2026-08-01T12:00:00.000Z'),
      tags: [],
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteTransactionUseCase(
      transactionRepository,
      accountRepository,
      creditCardRepository,
    );
  });

  it('throws NotFoundException when the transaction does not exist', async () => {
    transactionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', transactionId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
    expect(transactionRepository.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the transaction belongs to another user', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());

    await expect(
      useCase.execute({ userId: 'u2', transactionId: 't1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the account does not exist', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', transactionId: 't1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes an expense reverting the account balance', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(account(AccountType.CASH));

    await useCase.execute({ userId: 'u1', transactionId: 't1' });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', 50);
    expect(creditCardRepository.adjustUsedAmount).not.toHaveBeenCalled();
    expect(transactionRepository.delete).toHaveBeenCalledWith('t1');
  });

  it('deletes a credit account expense reverting the used amount', async () => {
    transactionRepository.findById.mockResolvedValue(transaction());
    accountRepository.findById.mockResolvedValue(account(AccountType.CREDIT));

    await useCase.execute({ userId: 'u1', transactionId: 't1' });

    expect(accountRepository.adjustBalance).toHaveBeenCalledWith('a1', 50);
    expect(creditCardRepository.adjustUsedAmount).toHaveBeenCalledWith(
      'a1',
      -50,
    );
  });
});
