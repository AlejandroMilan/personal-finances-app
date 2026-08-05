import { AccountType } from '../../domain/account-type.enum';
import { Account } from '../../domain/entities/account.entity';
import { CreditCard } from '../../domain/entities/credit-card.entity';
import { AccountRepository } from '../ports/account.repository';
import { CreditCardRepository } from '../ports/credit-card.repository';
import { ListAccountsUseCase } from './list-accounts.use-case';

describe('ListAccountsUseCase', () => {
  const accountRepository = { findById: jest.fn(), findByUserId: jest.fn(), save: jest.fn(), delete: jest.fn() };
  const creditCardRepository = { findByAccountId: jest.fn(), findByAccountIds: jest.fn(), save: jest.fn(), deleteByAccountId: jest.fn() };
  let useCase: ListAccountsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListAccountsUseCase(
      accountRepository as unknown as AccountRepository,
      creditCardRepository as unknown as CreditCardRepository,
    );
  });

  it('returns an empty list when the user has no accounts', async () => {
    accountRepository.findByUserId.mockResolvedValue([]);

    await expect(useCase.execute('u1')).resolves.toEqual([]);
    expect(creditCardRepository.findByAccountIds).not.toHaveBeenCalled();
  });

  it('returns accounts joined with their credit cards', async () => {
    const cash = Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Cash',
      balance: 50,
      color: '#2E6B4F',
      type: AccountType.CASH,
      createdAt: new Date(),
    });
    const credit = Account.restore({
      id: 'a2',
      userId: 'u1',
      name: 'Credit',
      balance: 0,
      color: '#D9C5A0',
      type: AccountType.CREDIT,
      createdAt: new Date(),
    });
    const card = CreditCard.restore({
      id: 'c1',
      accountId: 'a2',
      creditLimit: 5000,
      usedAmount: 100,
      cutoffDate: new Date(),
      paymentDate: new Date(),
    });

    accountRepository.findByUserId.mockResolvedValue([cash, credit]);
    creditCardRepository.findByAccountIds.mockResolvedValue([card]);

    const result = await useCase.execute('u1');

    expect(creditCardRepository.findByAccountIds).toHaveBeenCalledWith(['a1', 'a2']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ account: cash, creditCard: null });
    expect(result[1]).toEqual({ account: credit, creditCard: card });
  });
});
