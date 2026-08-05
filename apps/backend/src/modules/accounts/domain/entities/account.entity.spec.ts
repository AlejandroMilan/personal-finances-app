import { AccountType } from '../account-type.enum';
import { Account } from './account.entity';

describe('Account', () => {
  it('creates an account with generated id and creation date', () => {
    const account = Account.create({
      userId: 'u1',
      name: 'Savings',
      balance: 100,
      color: '#2E6B4F',
      type: AccountType.CASH,
    });

    expect(account.id).toBeTruthy();
    expect(account.userId).toBe('u1');
    expect(account.name).toBe('Savings');
    expect(account.balance).toBe(100);
    expect(account.color).toBe('#2E6B4F');
    expect(account.type).toBe(AccountType.CASH);
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it('restores an account from persistence', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const account = Account.restore({
      id: 'a1',
      userId: 'u1',
      name: 'Credit',
      balance: -50,
      color: '#000000',
      type: AccountType.CREDIT,
      createdAt,
    });

    expect(account.id).toBe('a1');
    expect(account.balance).toBe(-50);
    expect(account.type).toBe(AccountType.CREDIT);
    expect(account.createdAt).toBe(createdAt);
  });
});
