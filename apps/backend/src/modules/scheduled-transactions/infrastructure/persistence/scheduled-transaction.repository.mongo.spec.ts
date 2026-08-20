import { Model } from 'mongoose';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { MongoScheduledTransactionRepository } from './scheduled-transaction.repository.mongo';
import {
  ScheduledTransactionModel,
  ScheduledTransactionSchema,
} from './scheduled-transaction.schema';

describe('MongoScheduledTransactionRepository', () => {
  const scheduledFor = new Date('2026-09-01T00:00:00.000Z');
  const doc = {
    uuid: 's1',
    userId: 'u1',
    accountId: 'a1',
    categoryId: 'c1',
    type: TransactionType.EXPENSE,
    title: 'Rent',
    amount: 12000,
    tags: ['home'],
    scheduledFor,
    recurring: true,
    status: ScheduledTransactionStatus.PENDING,
    transactionId: undefined,
    createdAt: scheduledFor,
    updatedAt: scheduledFor,
  };

  let modelMock: {
    findOne: jest.Mock;
    find: jest.Mock;
    deleteOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };
  let execMock: jest.Mock;
  let sortMock: jest.Mock;

  beforeEach(() => {
    execMock = jest.fn().mockResolvedValue(doc);
    sortMock = jest.fn().mockReturnValue({ exec: execMock });
    modelMock = {
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({ sort: sortMock }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
    };
  });

  const repo = () =>
    new MongoScheduledTransactionRepository(
      modelMock as unknown as Model<ScheduledTransactionModel>,
    );

  it('uses its own collection, separate from transactions', () => {
    expect(ScheduledTransactionSchema.get('collection')).toBe(
      'scheduled_transactions',
    );
    expect(ScheduledTransactionSchema.get('collection')).not.toBe(
      'transactions',
    );
  });

  it('indexes by user, status and scheduled date', () => {
    const indexes = ScheduledTransactionSchema.indexes().map(
      ([fields]) => fields,
    );

    expect(indexes).toContainEqual({
      userId: 1,
      status: 1,
      scheduledFor: 1,
    });
  });

  it('returns an entity when found by id', async () => {
    const found = await repo().findById('s1');

    expect(modelMock.findOne).toHaveBeenCalledWith({ uuid: 's1' });
    expect(found).toBeInstanceOf(ScheduledTransaction);
    expect(found?.title).toBe('Rent');
    expect(found?.transactionId).toBeNull();
  });

  it('returns null when not found by id', async () => {
    execMock.mockResolvedValue(null);

    await expect(repo().findById('missing')).resolves.toBeNull();
  });

  it('scopes the listing to the user and sorts by scheduled date ascending', async () => {
    execMock.mockResolvedValue([doc]);

    const items = await repo().findByUserId('u1', {});

    expect(modelMock.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(sortMock).toHaveBeenCalledWith({ scheduledFor: 1 });
    expect(items).toHaveLength(1);
    expect(items[0]).toBeInstanceOf(ScheduledTransaction);
    expect(items[0].id).toBe('s1');
  });

  it('filters by status', async () => {
    execMock.mockResolvedValue([]);

    await repo().findByUserId('u1', {
      status: ScheduledTransactionStatus.PENDING,
    });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      status: ScheduledTransactionStatus.PENDING,
    });
  });

  it('filters by scheduled date range', async () => {
    execMock.mockResolvedValue([]);
    const from = new Date('2026-08-01T00:00:00.000Z');
    const to = new Date('2026-08-31T23:59:59.999Z');

    await repo().findByUserId('u1', { from, to });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      scheduledFor: { $gte: from, $lte: to },
    });
  });

  it.each([
    ['from', { from: new Date('2026-08-01T00:00:00.000Z') }, '$gte'],
    ['to', { to: new Date('2026-08-31T00:00:00.000Z') }, '$lte'],
  ])('filters by %s alone', async (_label, filters, operator) => {
    execMock.mockResolvedValue([]);

    await repo().findByUserId('u1', filters);

    const [query] = modelMock.find.mock.calls[0] as [
      { scheduledFor: Record<string, Date> },
    ];
    expect(Object.keys(query.scheduledFor)).toEqual([operator]);
  });

  it('saves the entity mapping every field', async () => {
    const scheduled = ScheduledTransaction.restore({
      id: 's1',
      userId: 'u1',
      accountId: 'a1',
      categoryId: null,
      type: TransactionType.INCOME,
      title: 'Payroll',
      amount: 25000,
      tags: [],
      scheduledFor,
      recurring: false,
      status: ScheduledTransactionStatus.EXECUTED,
      transactionId: 't1',
      createdAt: scheduledFor,
      updatedAt: scheduledFor,
    });

    const saved = await repo().save(scheduled);

    expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 's1' },
      {
        $set: {
          userId: 'u1',
          accountId: 'a1',
          categoryId: null,
          type: TransactionType.INCOME,
          title: 'Payroll',
          amount: 25000,
          tags: [],
          scheduledFor,
          recurring: false,
          status: ScheduledTransactionStatus.EXECUTED,
          transactionId: 't1',
          createdAt: scheduledFor,
          updatedAt: scheduledFor,
        },
      },
      { upsert: true, new: true },
    );
    expect(saved).toBeInstanceOf(ScheduledTransaction);
  });

  it('maps a document without category, tags or transaction id', async () => {
    execMock.mockResolvedValue({
      ...doc,
      categoryId: undefined,
      tags: undefined,
      transactionId: undefined,
    });

    const found = await repo().findById('s1');

    expect(found?.categoryId).toBeNull();
    expect(found?.tags).toEqual([]);
    expect(found?.transactionId).toBeNull();
  });

  it('deletes by id', async () => {
    await repo().deleteById('s1');

    expect(modelMock.deleteOne).toHaveBeenCalledWith({ uuid: 's1' });
  });
});
