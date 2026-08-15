import { TransactionType } from '../transaction-type.enum';
import { Transaction } from './transaction.entity';

describe('Transaction', () => {
  const props = {
    id: 't1',
    userId: 'u1',
    accountId: 'a1',
    categoryId: null,
    type: TransactionType.EXPENSE,
    title: 'Lunch',
    amount: 50,
    timestamp: new Date('2026-08-01T12:00:00.000Z'),
    tags: ['food'],
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
  };

  it('creates a transaction with generated id and creation date', () => {
    const transaction = Transaction.create(props);

    expect(transaction.id).toBeTruthy();
    expect(transaction.userId).toBe('u1');
    expect(transaction.accountId).toBe('a1');
    expect(transaction.title).toBe('Lunch');
    expect(transaction.amount).toBe(50);
    expect(transaction.categoryId).toBeNull();
    expect(transaction.type).toBe(TransactionType.EXPENSE);
    expect(transaction.tags).toEqual(['food']);
    expect(transaction.timestamp).toBeInstanceOf(Date);
    expect(transaction.createdAt).toBeInstanceOf(Date);
  });

  it('restores a transaction from persistence', () => {
    const transaction = Transaction.restore(props);

    expect(transaction.id).toBe('t1');
    expect(transaction.timestamp).toBe(props.timestamp);
  });

  it('computes a positive delta for income transactions', () => {
    const transaction = Transaction.create({
      ...props,
      type: TransactionType.INCOME,
    });

    expect(transaction.getBalanceDelta()).toBe(50);
  });

  it('computes a negative delta for expense transactions', () => {
    const transaction = Transaction.create(props);

    expect(transaction.getBalanceDelta()).toBe(-50);
  });
});
