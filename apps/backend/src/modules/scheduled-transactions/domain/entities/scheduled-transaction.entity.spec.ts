import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionError } from '../scheduled-transaction.error';
import { ScheduledTransactionStatus } from '../scheduled-transaction-status.enum';
import {
  CreateScheduledTransactionInput,
  ScheduledTransaction,
} from './scheduled-transaction.entity';

const input = (
  overrides: Partial<CreateScheduledTransactionInput> = {},
): CreateScheduledTransactionInput => ({
  userId: 'u1',
  accountId: 'a1',
  categoryId: 'c1',
  type: TransactionType.EXPENSE,
  title: 'Rent',
  amount: 12000,
  tags: ['home'],
  scheduledFor: new Date('2026-09-01T00:00:00.000Z'),
  recurring: true,
  ...overrides,
});

describe('ScheduledTransaction', () => {
  it('creates a pending scheduled transaction with generated id and dates', () => {
    const scheduled = ScheduledTransaction.create(input());

    expect(scheduled.id).toBeTruthy();
    expect(scheduled.status).toBe(ScheduledTransactionStatus.PENDING);
    expect(scheduled.transactionId).toBeNull();
    expect(scheduled.isPending()).toBe(true);
    expect(scheduled.userId).toBe('u1');
    expect(scheduled.accountId).toBe('a1');
    expect(scheduled.categoryId).toBe('c1');
    expect(scheduled.type).toBe(TransactionType.EXPENSE);
    expect(scheduled.amount).toBe(12000);
    expect(scheduled.recurring).toBe(true);
    expect(scheduled.scheduledFor.toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
    expect(scheduled.createdAt).toBeInstanceOf(Date);
    expect(scheduled.updatedAt).toBeInstanceOf(Date);
  });

  it('trims the title and drops blank tags', () => {
    const scheduled = ScheduledTransaction.create(
      input({ title: '  Rent  ', tags: ['  home  ', '   ', 'fixed'] }),
    );

    expect(scheduled.title).toBe('Rent');
    expect(scheduled.tags).toEqual(['home', 'fixed']);
  });

  it.each([0, -1, Number.NaN])('rejects an amount of %p', (amount) => {
    expect(() => ScheduledTransaction.create(input({ amount }))).toThrow(
      ScheduledTransactionError,
    );
  });

  it.each(['', '   '])('rejects the title %p', (title) => {
    expect(() => ScheduledTransaction.create(input({ title }))).toThrow(
      ScheduledTransactionError,
    );
  });

  it('restores a scheduled transaction from persistence', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    const scheduled = ScheduledTransaction.restore({
      id: 's1',
      userId: 'u1',
      accountId: 'a1',
      categoryId: null,
      type: TransactionType.INCOME,
      title: 'Payroll',
      amount: 25000,
      tags: [],
      scheduledFor: date,
      recurring: false,
      status: ScheduledTransactionStatus.EXECUTED,
      transactionId: 't1',
      createdAt: date,
      updatedAt: date,
    });

    expect(scheduled.id).toBe('s1');
    expect(scheduled.categoryId).toBeNull();
    expect(scheduled.title).toBe('Payroll');
    expect(scheduled.type).toBe(TransactionType.INCOME);
    expect(scheduled.tags).toEqual([]);
    expect(scheduled.recurring).toBe(false);
    expect(scheduled.transactionId).toBe('t1');
    expect(scheduled.createdAt).toBe(date);
    expect(scheduled.updatedAt).toBe(date);
    expect(scheduled.isPending()).toBe(false);
  });

  describe('markExecuted', () => {
    it('moves a pending scheduled transaction to executed with the transaction id', () => {
      const executed = ScheduledTransaction.create(input()).markExecuted('t1');

      expect(executed.status).toBe(ScheduledTransactionStatus.EXECUTED);
      expect(executed.transactionId).toBe('t1');
    });

    it('rejects executing an already executed scheduled transaction', () => {
      const executed = ScheduledTransaction.create(input()).markExecuted('t1');

      expect(() => executed.markExecuted('t2')).toThrow(
        ScheduledTransactionError,
      );
    });

    it('rejects executing a cancelled scheduled transaction', () => {
      const cancelled = ScheduledTransaction.create(input()).cancel();

      expect(() => cancelled.markExecuted('t1')).toThrow(
        ScheduledTransactionError,
      );
    });
  });

  describe('cancel', () => {
    it('moves a pending scheduled transaction to cancelled', () => {
      const cancelled = ScheduledTransaction.create(input()).cancel();

      expect(cancelled.status).toBe(ScheduledTransactionStatus.CANCELLED);
      expect(cancelled.transactionId).toBeNull();
    });

    it('rejects cancelling an executed scheduled transaction', () => {
      const executed = ScheduledTransaction.create(input()).markExecuted('t1');

      expect(() => executed.cancel()).toThrow(ScheduledTransactionError);
    });

    it('rejects cancelling an already cancelled scheduled transaction', () => {
      const cancelled = ScheduledTransaction.create(input()).cancel();

      expect(() => cancelled.cancel()).toThrow(ScheduledTransactionError);
    });
  });
});
