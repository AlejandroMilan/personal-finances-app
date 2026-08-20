import { NotFoundException } from '@nestjs/common';
import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { DeleteAccountUseCase } from './delete-account.use-case';

describe('DeleteAccountUseCase', () => {
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
  const transactionRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByAccountId: jest.fn(),
    clearCategoryReferences: jest.fn(),
    summarize: jest.fn(),
  };
  let useCase: DeleteAccountUseCase;

  const account = () =>
    Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Credit',
      balance: 0,
      color: '#D9C5A0',
      type: AccountType.CREDIT,
      createdAt: new Date(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteAccountUseCase(
      accountRepository,
      creditCardRepository,
      transactionRepository,
    );
  });

  it('deletes the account, its credit card and its transactions', async () => {
    accountRepository.findById.mockResolvedValue(account());

    await useCase.execute({ userId: 'u1', accountId: 'a1' });

    expect(transactionRepository.deleteByAccountId).toHaveBeenCalledWith(
      'u1',
      'a1',
    );
    expect(creditCardRepository.deleteByAccountId).toHaveBeenCalledWith('a1');
    expect(accountRepository.delete).toHaveBeenCalledWith('a1');
  });

  it('throws NotFoundException when the account does not exist', async () => {
    accountRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', accountId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the account belongs to another user', async () => {
    accountRepository.findById.mockResolvedValue(account());

    await expect(
      useCase.execute({ userId: 'u2', accountId: 'a1' }),
    ).rejects.toThrow(NotFoundException);
    expect(accountRepository.delete).not.toHaveBeenCalled();
  });
});
