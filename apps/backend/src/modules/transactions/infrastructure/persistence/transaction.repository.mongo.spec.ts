import { Model } from 'mongoose';
import { TransactionType } from '../../domain/transaction-type.enum';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionModel } from './transaction.schema';
import { MongoTransactionRepository } from './transaction.repository.mongo';

describe('MongoTransactionRepository', () => {
  const doc = {
    uuid: 't1',
    userId: 'u1',
    accountId: 'a1',
    categoryId: 'c1',
    type: TransactionType.EXPENSE,
    title: 'Lunch',
    amount: 50,
    timestamp: new Date('2026-08-01T12:00:00.000Z'),
    tags: ['food'],
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
  };

  let execMock: jest.Mock;
  let countMock: jest.Mock;
  let skipChain: { limit: jest.Mock };
  let sortChain: { skip: jest.Mock };
  let findChain: { sort: jest.Mock };
  let modelMock: {
    findOne: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    deleteOne: jest.Mock;
    deleteMany: jest.Mock;
    updateMany: jest.Mock;
    findOneAndUpdate: jest.Mock;
    aggregate: jest.Mock;
  };

  beforeEach(() => {
    execMock = jest.fn().mockResolvedValue([doc]);
    countMock = jest.fn().mockResolvedValue(1);
    skipChain = { limit: jest.fn().mockReturnValue({ exec: execMock }) };
    sortChain = { skip: jest.fn().mockReturnValue(skipChain) };
    findChain = { sort: jest.fn().mockReturnValue(sortChain) };
    modelMock = {
      findOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      find: jest.fn().mockReturnValue(findChain),
      countDocuments: jest.fn().mockReturnValue({ exec: countMock }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      updateMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) }),
      findOneAndUpdate: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
      aggregate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ byCategory: [], series: [] }]),
      }),
    };
  });

  const withFacets = (facets: unknown[]): void => {
    modelMock.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(facets),
    });
  };

  const repo = () =>
    new MongoTransactionRepository(
      modelMock as unknown as Model<TransactionModel>,
    );

  it('saves a transaction mapping the entity to a document', async () => {
    const transaction = Transaction.restore({
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

    const expectedSet = expect.objectContaining({
      title: 'Lunch',
      amount: 50,
      categoryId: 'c1',
    }) as Record<string, unknown>;
    const expectedUpdate = expect.objectContaining({
      $set: expectedSet,
    }) as Record<string, unknown>;

    const saved = await repo().save(transaction);

    expect(modelMock.findOneAndUpdate).toHaveBeenCalledWith(
      { uuid: 't1' },
      expectedUpdate,
      { upsert: true, new: true },
    );
    expect(saved.id).toBe('t1');
    expect(saved.title).toBe('Lunch');
  });

  it('returns a transaction entity when found by id', async () => {
    const found = await repo().findById('t1');

    expect(modelMock.findOne).toHaveBeenCalledWith({ uuid: 't1' });
    expect(found?.title).toBe('Lunch');
  });

  it('returns null when not found by id', async () => {
    modelMock.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(repo().findById('missing')).resolves.toBeNull();
  });

  it('queries transactions by user with pagination and newest first', async () => {
    const result = await repo().findByUserId('u1', { page: 2, limit: 20 });

    expect(modelMock.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(findChain.sort).toHaveBeenCalledWith({ timestamp: -1 });
    expect(sortChain.skip).toHaveBeenCalledWith(20);
    expect(modelMock.countDocuments).toHaveBeenCalledWith({ userId: 'u1' });
    expect(result).toEqual({
      items: [expect.objectContaining({ id: 't1' })],
      total: 1,
      page: 2,
      limit: 20,
    });
  });

  it('filters by account, category, type, title and tags', async () => {
    await repo().findByUserId('u1', {
      accountId: 'a1',
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: 'lun',
      tags: ['food'],
      page: 1,
      limit: 20,
    });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      accountId: 'a1',
      categoryId: 'c1',
      type: TransactionType.EXPENSE,
      title: { $regex: 'lun', $options: 'i' },
      tags: { $in: ['food'] },
    });
  });

  it('escapes regex characters in the title filter', async () => {
    await repo().findByUserId('u1', { title: 'a.b*', page: 1, limit: 20 });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      title: { $regex: 'a\\.b\\*', $options: 'i' },
    });
  });

  it('filters by a date range', async () => {
    const from = new Date('2026-08-01');
    const to = new Date('2026-08-31');

    await repo().findByUserId('u1', { from, to, page: 1, limit: 20 });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      timestamp: { $gte: from, $lte: to },
    });
  });

  it('filters by a start date only', async () => {
    const from = new Date('2026-08-01');

    await repo().findByUserId('u1', { from, page: 1, limit: 20 });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      timestamp: { $gte: from },
    });
  });

  it('deletes a transaction by id', async () => {
    await repo().delete('t1');

    expect(modelMock.deleteOne).toHaveBeenCalledWith({ uuid: 't1' });
  });

  it('deletes all transactions of an account', async () => {
    await repo().deleteByAccountId('a1');

    expect(modelMock.deleteMany).toHaveBeenCalledWith({ accountId: 'a1' });
  });

  it('clears the category references of the transactions', async () => {
    await repo().clearCategoryReferences('c1');

    expect(modelMock.updateMany).toHaveBeenCalledWith(
      { categoryId: 'c1' },
      { $set: { categoryId: null } },
    );
  });

  describe('summarize', () => {
    const query = {
      from: new Date('2026-08-01T06:00:00.000Z'),
      to: new Date('2026-08-04T05:59:59.999Z'),
      granularity: 'day' as const,
      timeZone: 'America/Mexico_City',
    };

    it('aggregates in the database filtering by user and date range', async () => {
      await repo().summarize('u1', query);

      const pipeline = modelMock.aggregate.mock.calls[0][0] as Array<
        Record<string, unknown>
      >;
      expect(pipeline[0]).toEqual({
        $match: {
          userId: 'u1',
          timestamp: { $gte: query.from, $lte: query.to },
        },
      });
      expect(pipeline[1]).toHaveProperty('$facet');
      expect(modelMock.find).not.toHaveBeenCalled();
    });

    it('truncates the series buckets with the requested granularity and time zone', async () => {
      await repo().summarize('u1', { ...query, granularity: 'month' });

      const pipeline = modelMock.aggregate.mock.calls[0][0] as Array<{
        $facet?: { series: Array<{ $group: { _id: { bucket: unknown } } }> };
      }>;
      expect(pipeline[1].$facet?.series[0].$group._id.bucket).toEqual({
        $dateTrunc: {
          date: '$timestamp',
          unit: 'month',
          timezone: 'America/Mexico_City',
        },
      });
    });

    it('returns totals per type and per category, sorted by amount', async () => {
      withFacets([
        {
          byCategory: [
            { _id: { type: 'expense', categoryId: 'c1' }, total: 30.5 },
            { _id: { type: 'expense', categoryId: 'c2' }, total: 120 },
            { _id: { type: 'income', categoryId: 'c3' }, total: 200 },
          ],
          series: [],
        },
      ]);

      const summary = await repo().summarize('u1', query);

      expect(summary.totals).toEqual({ income: 200, expense: 150.5 });
      expect(summary.byCategory.expense).toEqual([
        { categoryId: 'c2', total: 120 },
        { categoryId: 'c1', total: 30.5 },
      ]);
      expect(summary.byCategory.income).toEqual([
        { categoryId: 'c3', total: 200 },
      ]);
    });

    it('keeps uncategorised transactions under a null category', async () => {
      withFacets([
        {
          byCategory: [
            { _id: { type: 'expense', categoryId: null }, total: 40 },
          ],
          series: [],
        },
      ]);

      const summary = await repo().summarize('u1', query);

      expect(summary.byCategory.expense).toEqual([
        { categoryId: null, total: 40 },
      ]);
      expect(summary.totals.expense).toBe(40);
    });

    it('fills the intervals without movements with zeros, in chronological order', async () => {
      withFacets([
        {
          byCategory: [],
          series: [
            {
              _id: { bucket: new Date('2026-08-03T06:00:00.000Z'), type: 'income' },
              total: 500,
            },
            {
              _id: { bucket: new Date('2026-08-01T06:00:00.000Z'), type: 'expense' },
              total: 25,
            },
          ],
        },
      ]);

      const summary = await repo().summarize('u1', query);

      expect(summary.series).toEqual([
        {
          bucket: new Date('2026-08-01T06:00:00.000Z'),
          income: 0,
          expense: 25,
        },
        {
          bucket: new Date('2026-08-02T06:00:00.000Z'),
          income: 0,
          expense: 0,
        },
        {
          bucket: new Date('2026-08-03T06:00:00.000Z'),
          income: 500,
          expense: 0,
        },
      ]);
    });

    it('adds up income and expense that fall in the same bucket', async () => {
      withFacets([
        {
          byCategory: [],
          series: [
            {
              _id: { bucket: new Date('2026-08-01T06:00:00.000Z'), type: 'income' },
              total: 0.1,
            },
            {
              _id: { bucket: new Date('2026-08-01T06:00:00.000Z'), type: 'expense' },
              total: 0.2,
            },
          ],
        },
      ]);

      const summary = await repo().summarize('u1', query);

      expect(summary.series[0]).toEqual({
        bucket: new Date('2026-08-01T06:00:00.000Z'),
        income: 0.1,
        expense: 0.2,
      });
    });

    it('returns an empty summary when the aggregation yields no facets', async () => {
      withFacets([]);

      const summary = await repo().summarize('u1', query);

      expect(summary.totals).toEqual({ income: 0, expense: 0 });
      expect(summary.byCategory).toEqual({ income: [], expense: [] });
      expect(summary.series).toHaveLength(3);
      expect(summary.series.every((point) => point.income === 0)).toBe(true);
    });
  });
});
