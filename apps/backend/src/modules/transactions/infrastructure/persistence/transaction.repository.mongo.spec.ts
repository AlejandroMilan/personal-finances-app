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
    };
  });

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
});
