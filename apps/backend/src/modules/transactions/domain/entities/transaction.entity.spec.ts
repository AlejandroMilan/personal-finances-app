import { TransactionType } from '../transaction-type.enum';
import { TransactionError } from '../transaction.error';
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
    expect(transaction.destinationAccountId).toBeNull();
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
    expect(transaction.destinationAccountId).toBeNull();
  });

  it('exposes the transfer transaction type', () => {
    expect(TransactionType.TRANSFER).toBe('transfer');
  });

  it('creates a transfer without a category and with a destination account', () => {
    const transaction = Transaction.create({
      ...props,
      categoryId: 'c1',
      type: TransactionType.TRANSFER,
      destinationAccountId: 'a2',
    });

    expect(transaction.type).toBe(TransactionType.TRANSFER);
    expect(transaction.destinationAccountId).toBe('a2');
    expect(transaction.categoryId).toBeNull();
  });

  it.each([undefined, null, ''])(
    'rejects a transfer without a destination account (%p)',
    (destinationAccountId) => {
      expect(() =>
        Transaction.create({
          ...props,
          type: TransactionType.TRANSFER,
          destinationAccountId,
        }),
      ).toThrow(TransactionError);
    },
  );

  it('rejects a transfer to its source account', () => {
    expect(() =>
      Transaction.create({
        ...props,
        type: TransactionType.TRANSFER,
        destinationAccountId: props.accountId,
      }),
    ).toThrow(TransactionError);
  });

  it.each([TransactionType.INCOME, TransactionType.EXPENSE])(
    'rejects a %s with a destination account',
    (type) => {
      expect(() =>
        Transaction.create({
          ...props,
          type,
          destinationAccountId: 'a2',
        }),
      ).toThrow(TransactionError);
    },
  );

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

  it('does not compute a destination delta for regular transactions', () => {
    const transaction = Transaction.create(props);

    expect(transaction.getDestinationBalanceDelta()).toBe(0);
  });

  it('computes both balance deltas for a transfer', () => {
    const transaction = Transaction.create({
      ...props,
      type: TransactionType.TRANSFER,
      destinationAccountId: 'a2',
    });

    expect(transaction.getBalanceDelta()).toBe(-50);
    expect(transaction.getDestinationBalanceDelta()).toBe(50);
  });

  it('restores a transfer with its destination account', () => {
    const transaction = Transaction.restore({
      ...props,
      categoryId: 'c1',
      type: TransactionType.TRANSFER,
      destinationAccountId: 'a2',
    });

    expect(transaction.destinationAccountId).toBe('a2');
    expect(transaction.categoryId).toBeNull();
  });
});
