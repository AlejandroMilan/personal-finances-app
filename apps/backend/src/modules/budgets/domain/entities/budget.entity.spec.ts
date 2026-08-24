import { BudgetError } from '../budget.error';
import {
  Budget,
  BudgetItemType,
  type BudgetItem,
  type BudgetProps,
  type CreateBudgetInput,
} from './budget.entity';

const item = (overrides: Partial<BudgetItem> = {}): BudgetItem => ({
  categoryId: 'c1',
  type: BudgetItemType.EXPENSE,
  amount: 250,
  note: 'Groceries',
  ...overrides,
});

const input = (
  overrides: Partial<CreateBudgetInput> = {},
): CreateBudgetInput => ({
  userId: 'u1',
  month: '2026-08',
  items: [item()],
  ...overrides,
});

describe('Budget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a budget with a generated id and creation dates', () => {
    const budget = Budget.create(
      input({
        items: [
          item({ categoryId: 'c1', type: BudgetItemType.EXPENSE }),
          item({
            categoryId: 'c2',
            type: BudgetItemType.INCOME,
            amount: 3000,
            note: 'Salary',
          }),
        ],
      }),
    );

    expect(budget.id).toBeTruthy();
    expect(budget.userId).toBe('u1');
    expect(budget.month).toBe('2026-08');
    expect(budget.items).toHaveLength(2);
    expect(budget.items[1]).toEqual({
      categoryId: 'c2',
      type: BudgetItemType.INCOME,
      amount: 3000,
      note: 'Salary',
    });
    expect(budget.createdAt).toBeInstanceOf(Date);
    expect(budget.updatedAt).toBeInstanceOf(Date);
    expect(budget.updatedAt).toBe(budget.createdAt);
  });

  it.each([
    '',
    '2026',
    '2026-1',
    '2026-00',
    '2026-13',
    '26-08',
    '2026-08-extra',
  ])('rejects the invalid month %p', (month) => {
    expect(() => Budget.create(input({ month }))).toThrow(BudgetError);
  });

  it.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])('rejects the invalid item amount %p', (amount) => {
    expect(() => Budget.create(input({ items: [item({ amount })] }))).toThrow(
      BudgetError,
    );
  });

  it('rejects duplicate items with the same category and type', () => {
    expect(() =>
      Budget.create(
        input({
          items: [
            item({ categoryId: 'c1', type: BudgetItemType.EXPENSE }),
            item({
              categoryId: 'c1',
              type: BudgetItemType.EXPENSE,
              amount: 500,
            }),
          ],
        }),
      ),
    ).toThrow(BudgetError);
  });

  it('accepts the same category with different item types', () => {
    const budget = Budget.create(
      input({
        items: [
          item({ categoryId: 'c1', type: BudgetItemType.INCOME, amount: 3000 }),
          item({ categoryId: 'c1', type: BudgetItemType.EXPENSE, amount: 250 }),
        ],
      }),
    );

    expect(budget.items).toHaveLength(2);
    expect(budget.plannedFor('c1', BudgetItemType.INCOME)).toBe(3000);
    expect(budget.plannedFor('c1', BudgetItemType.EXPENSE)).toBe(250);
  });

  it('rejects an unsupported item type', () => {
    expect(() =>
      Budget.create(
        input({
          items: [item({ type: 'transfer' as BudgetItemType })],
        }),
      ),
    ).toThrow(BudgetError);
  });

  it('restores every persisted budget property without regenerating metadata', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-15T00:00:00.000Z');
    const items: BudgetItem[] = [
      item({
        categoryId: 'c1',
        type: BudgetItemType.INCOME,
        amount: 3000,
        note: 'Salary',
      }),
      item({
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 250,
        note: undefined,
      }),
    ];
    const props: BudgetProps = {
      id: 'b1',
      userId: 'u1',
      month: '2026-08',
      items,
      createdAt,
      updatedAt,
    };

    const budget = Budget.restore(props);

    expect(budget.id).toBe('b1');
    expect(budget.userId).toBe('u1');
    expect(budget.month).toBe('2026-08');
    expect(budget.items).toBe(items);
    expect(budget.items).toEqual(items);
    expect(budget.createdAt).toBe(createdAt);
    expect(budget.updatedAt).toBe(updatedAt);
  });

  it('returns the planned amount for a matching category and type', () => {
    const budget = Budget.create(
      input({
        items: [item({ categoryId: 'c1', type: BudgetItemType.EXPENSE })],
      }),
    );

    expect(budget.plannedFor('c1', BudgetItemType.EXPENSE)).toBe(250);
  });

  it('returns zero when no item matches the category and type', () => {
    const budget = Budget.create(
      input({
        items: [item({ categoryId: 'c1', type: BudgetItemType.EXPENSE })],
      }),
    );

    expect(budget.plannedFor('c1', BudgetItemType.INCOME)).toBe(0);
    expect(budget.plannedFor('missing-category', BudgetItemType.EXPENSE)).toBe(
      0,
    );
  });
});
