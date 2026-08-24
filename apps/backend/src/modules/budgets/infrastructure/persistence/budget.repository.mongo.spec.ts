import { Model } from 'mongoose';
import { Budget, BudgetItemType, type BudgetItem, type BudgetProps } from '../../domain/entities/budget.entity';
import { BUDGET_REPOSITORY } from '../../application/ports/budget.repository';
import { BudgetModel, BudgetSchema } from './budget.schema';
import { BudgetMongoRepository } from './budget.repository.mongo';

describe('BudgetMongoRepository', () => {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-15T00:00:00.000Z');
  const items: BudgetItem[] = [
    {
      categoryId: 'c1',
      type: BudgetItemType.EXPENSE,
      amount: 250,
      note: 'Groceries',
    },
    {
      categoryId: 'c2',
      type: BudgetItemType.INCOME,
      amount: 3000,
    },
  ];
  const doc = {
    uuid: 'b1',
    userId: 'u1',
    month: '2026-08',
    items,
    createdAt,
    updatedAt,
  };

  type BudgetQuery = {
    userId: string;
    month?: { $gte?: string; $lte?: string };
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
    jest.clearAllMocks();
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
    new BudgetMongoRepository(modelMock as unknown as Model<BudgetModel>);

  const restoreBudget = (overrides: Partial<BudgetProps> = {}): Budget =>
    Budget.restore({
      id: 'b1',
      userId: 'u1',
      month: '2026-08',
      items,
      createdAt,
      updatedAt,
      ...overrides,
    });

  const mockFilteredFind = (candidates: Array<typeof doc>): void => {
    modelMock.find.mockImplementation((query: BudgetQuery) => {
      const matching = candidates.filter((candidate) => {
        if (candidate.userId !== query.userId) {
          return false;
        }

        if (!query.month) {
          return true;
        }

        return (
          (!query.month.$gte || candidate.month >= query.month.$gte) &&
          (!query.month.$lte || candidate.month <= query.month.$lte)
        );
      });

      sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          matching.sort((left, right) => left.month.localeCompare(right.month)),
        ),
      });
      return { sort: sortMock };
    });
  };

  it('exports the repository injection token', () => {
    expect(BUDGET_REPOSITORY).toBe('BUDGET_REPOSITORY');
  });

  it('declares a unique compound index for one budget per user and month', () => {
    const indexes = BudgetSchema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [
          { userId: 1, month: 1 },
          expect.objectContaining({ unique: true }),
        ],
      ]),
    );
  });

  it('returns a Budget entity with every embedded field when found by user and month', async () => {
    const found = await repo().findByMonth('u1', '2026-08');

    expect(modelMock.findOne).toHaveBeenCalledWith({
      userId: 'u1',
      month: '2026-08',
    });
    expect(found).toBeInstanceOf(Budget);
    expect(found?.id).toBe('b1');
    expect(found?.userId).toBe('u1');
    expect(found?.month).toBe('2026-08');
    expect(found?.items).toEqual([
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 250,
        note: 'Groceries',
      },
      {
        categoryId: 'c2',
        type: BudgetItemType.INCOME,
        amount: 3000,
      },
    ]);
    expect(found?.createdAt).toBe(createdAt);
    expect(found?.updatedAt).toBe(updatedAt);
  });

  it('returns null when no budget exists for the requested month', async () => {
    execMock.mockResolvedValue(null);

    await expect(repo().findByMonth('u1', '2026-08')).resolves.toBeNull();
  });

  it('does not return a budget from another user for the same month', async () => {
    modelMock.findOne.mockImplementation(
      (query: { userId: string; month: string }) => ({
        exec: jest.fn().mockResolvedValue(
          query.userId === doc.userId && query.month === doc.month ? doc : null,
        ),
      }),
    );

    await expect(repo().findByMonth('u2', '2026-08')).resolves.toBeNull();
    expect(modelMock.findOne).toHaveBeenCalledWith({
      userId: 'u2',
      month: '2026-08',
    });
  });

  it('lists only the requested user budgets ordered by month ascending', async () => {
    const september = { ...doc, uuid: 'b-september', month: '2026-09' };
    const august = { ...doc, uuid: 'b-august', month: '2026-08' };
    const foreign = { ...doc, uuid: 'b-foreign', userId: 'u2', month: '2026-08' };
    mockFilteredFind([september, foreign, august]);

    const budgets = await repo().list('u1', {});

    expect(modelMock.find).toHaveBeenCalledWith({ userId: 'u1' });
    expect(sortMock).toHaveBeenCalledWith({ month: 1 });
    expect(budgets.map((budget) => budget.id)).toEqual(['b-august', 'b-september']);
    expect(budgets.every((budget) => budget.userId === 'u1')).toBe(true);
    expect(budgets.every((budget) => budget instanceof Budget)).toBe(true);
  });

  it('filters the listing by both month boundaries and keeps the ascending order', async () => {
    const september = { ...doc, uuid: 'b-september', month: '2026-09' };
    const august = { ...doc, uuid: 'b-august', month: '2026-08' };
    const july = { ...doc, uuid: 'b-july', month: '2026-07' };
    const foreign = { ...doc, uuid: 'b-foreign', userId: 'u2', month: '2026-08' };
    mockFilteredFind([september, foreign, july, august]);

    const budgets = await repo().list('u1', {
      from: '2026-08',
      to: '2026-09',
    });

    expect(modelMock.find).toHaveBeenCalledWith({
      userId: 'u1',
      month: { $gte: '2026-08', $lte: '2026-09' },
    });
    expect(sortMock).toHaveBeenCalledWith({ month: 1 });
    expect(budgets.map((budget) => budget.month)).toEqual([
      '2026-08',
      '2026-09',
    ]);
  });

  it.each([
    ['from', { from: '2026-08' }, { $gte: '2026-08' }],
    ['to', { to: '2026-09' }, { $lte: '2026-09' }],
  ])('supports a %s month filter without adding the other boundary', async (_label, filters, month) => {
    execMock.mockResolvedValue([]);

    await repo().list('u1', filters);

    expect(modelMock.find).toHaveBeenCalledWith({ userId: 'u1', month });
  });

  it('upserts by user and month and persists a newer updatedAt without inserting duplicates', async () => {
    const firstUpdatedAt = new Date('2026-01-10T00:00:00.000Z');
    const secondUpdatedAt = new Date('2026-01-20T00:00:00.000Z');
    const first = restoreBudget({
      items: [items[0]],
      updatedAt: firstUpdatedAt,
    });
    const second = restoreBudget({
      items: [items[0], { ...items[1], amount: 3500 }],
      updatedAt: secondUpdatedAt,
    });
    execMock
      .mockResolvedValueOnce({ ...doc, updatedAt: firstUpdatedAt, items: first.items })
      .mockResolvedValueOnce({ ...doc, updatedAt: secondUpdatedAt, items: second.items });

    await repo().save(first);
    const saved = await repo().save(second);

    const expectedFilter = { userId: 'u1', month: '2026-08' };
    expect(modelMock.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(modelMock.findOneAndUpdate).toHaveBeenNthCalledWith(
      1,
      expectedFilter,
      {
        $set: {
          uuid: 'b1',
          userId: 'u1',
          month: '2026-08',
          items: first.items,
          createdAt,
          updatedAt: firstUpdatedAt,
        },
      },
      { upsert: true, new: true },
    );
    expect(modelMock.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      expectedFilter,
      {
        $set: {
          uuid: 'b1',
          userId: 'u1',
          month: '2026-08',
          items: second.items,
          createdAt,
          updatedAt: secondUpdatedAt,
        },
      },
      { upsert: true, new: true },
    );
    expect(saved).toBeInstanceOf(Budget);
    expect(saved.updatedAt).toBe(secondUpdatedAt);
    expect(saved.items).toEqual(second.items);
  });

  it('deletes a budget by user and month', async () => {
    await repo().deleteByMonth('u1', '2026-08');

    expect(modelMock.deleteOne).toHaveBeenCalledWith({
      userId: 'u1',
      month: '2026-08',
    });
  });
});
