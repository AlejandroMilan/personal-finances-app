import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Budget, BudgetItem } from '../types/budget';
import type { CategoryTotalView, TransactionsSummaryView } from '../types/summary';
import { buildBudgetStatus, monthKey, monthsInPeriod } from './budget';

const makeBudget = (
  month: string,
  items: BudgetItem[],
  id = month,
): Budget => ({
  id,
  month,
  items,
  createdAt: `${month}-01T00:00:00.000Z`,
  updatedAt: `${month}-01T00:00:00.000Z`,
});

const makeSummary = (
  income: CategoryTotalView[] = [],
  expense: CategoryTotalView[] = [],
): Pick<TransactionsSummaryView, 'byCategory'> => ({
  byCategory: { income, expense },
});

const findRow = (
  status: ReturnType<typeof buildBudgetStatus>,
  categoryId: string | null,
  type: 'income' | 'expense',
) => status.rows.find((row) => row.categoryId === categoryId && row.type === type);

const numericRowFields = ['planned', 'actual', 'ratio', 'remaining'] as const;

const expectFiniteRows = (status: ReturnType<typeof buildBudgetStatus>) => {
  status.rows.forEach((row) => {
    numericRowFields.forEach((field) => {
      expect(Number.isNaN(row[field])).toBe(false);
      expect(Number.isFinite(row[field])).toBe(true);
    });
  });
};

beforeAll(() => {
  vi.stubEnv('TZ', 'America/Mexico_City');
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('monthKey', () => {
  it('uses local calendar fields instead of UTC fields', () => {
    const date = new Date('2026-09-01T00:30:00.000Z');

    expect(date.getMonth()).toBe(7);
    expect(date.getUTCMonth()).toBe(8);
    expect(monthKey(date)).toBe('2026-08');
    expect(monthKey(date)).not.toBe('2026-09');
  });

  it('keeps the local month for a date created shortly after local month start', () => {
    const date = new Date(2026, 8, 1, 0, 30);

    expect(monthKey(date)).toBe('2026-09');
  });

  it('rejects an invalid date', () => {
    expect(() => monthKey(new Date('invalid'))).toThrow(RangeError);
  });
});

describe('monthsInPeriod', () => {
  it('returns one month when both dates are in the same calendar month', () => {
    expect(
      monthsInPeriod(
        new Date(2026, 7, 1, 10, 0),
        new Date(2026, 7, 31, 23, 59),
      ),
    ).toEqual(['2026-08']);
  });

  it('returns every touched month when the period crosses calendar months', () => {
    expect(
      monthsInPeriod(
        new Date(2026, 7, 31, 23, 59),
        new Date(2026, 10, 1, 0, 1),
      ),
    ).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });

  it('rejects invalid dates', () => {
    const validDate = new Date(2026, 7, 1);

    expect(() => monthsInPeriod(new Date('invalid'), validDate)).toThrow(
      'A period needs two valid dates',
    );
    expect(() => monthsInPeriod(validDate, new Date('invalid'))).toThrow(
      'A period needs two valid dates',
    );
  });

  it('rejects a period whose start is after its end', () => {
    const validDate = new Date(2026, 7, 1);

    expect(() => monthsInPeriod(new Date(2026, 7, 2), validDate)).toThrow(
      'The start date must not be after the end date',
    );
  });

  it('rejects a period whose start month is after its end month', () => {
    expect(() =>
      monthsInPeriod(new Date(2026, 8, 2), new Date(2026, 7, 31)),
    ).toThrow('The start date must not be after the end date');
  });
});

describe('buildBudgetStatus', () => {
  it('sums planned amounts across months by category and type before comparing actuals', () => {
    const status = buildBudgetStatus(
      [
        makeBudget('2026-07', [
          { categoryId: 'food', type: 'expense', amount: 999 },
        ]),
        makeBudget('2026-08', [
          { categoryId: 'food', type: 'expense', amount: 100 },
          { categoryId: 'food', type: 'income', amount: 1000 },
          { categoryId: 'rounding', type: 'expense', amount: 0.1 },
        ]),
        makeBudget('2026-09', [
          { categoryId: 'food', type: 'expense', amount: 50 },
          { categoryId: 'food', type: 'income', amount: 500 },
          { categoryId: 'rounding', type: 'expense', amount: 0.2 },
        ]),
      ],
      makeSummary(
        [{ categoryId: 'food', total: 1250 }, { categoryId: 'zero', total: 0 }],
        [
          { categoryId: 'food', total: 180 },
          { categoryId: 'rounding', total: 0.1 + 0.2 },
          { categoryId: 'zero', total: 0 },
          { categoryId: 'unbudgeted', total: 20 },
        ],
      ),
      new Date(2026, 7, 1),
      new Date(2026, 8, 30),
    );

    expectFiniteRows(status);

    expect(findRow(status, 'food', 'expense')).toEqual({
      categoryId: 'food',
      type: 'expense',
      planned: 150,
      actual: 180,
      ratio: 1.2,
      remaining: -30,
      unbudgeted: false,
    });
    expect(findRow(status, 'food', 'income')).toEqual({
      categoryId: 'food',
      type: 'income',
      planned: 1500,
      actual: 1250,
      ratio: 1250 / 1500,
      remaining: 250,
      unbudgeted: false,
    });
    expect(findRow(status, 'rounding', 'expense')).toEqual({
      categoryId: 'rounding',
      type: 'expense',
      planned: 0.3,
      actual: 0.3,
      ratio: 1,
      remaining: 0,
      unbudgeted: false,
    });
    expect(status.rows).not.toContainEqual(
      expect.objectContaining({ categoryId: 'zero' }),
    );
    expect(status.missingMonths).toEqual([]);
  });

  it('marks actual totals without a budget as unbudgeted with zero planned amount', () => {
    const status = buildBudgetStatus(
      [],
      makeSummary([], [{ categoryId: 'unbudgeted', total: 45 }]),
      new Date(2026, 7, 1),
      new Date(2026, 7, 31),
    );
    const row = findRow(status, 'unbudgeted', 'expense');

    expectFiniteRows(status);

    expect(row).toEqual({
      categoryId: 'unbudgeted',
      type: 'expense',
      planned: 0,
      actual: 45,
      ratio: 0,
      remaining: -45,
      unbudgeted: true,
    });
    expect(Number.isNaN(row?.ratio)).toBe(false);
    expect(Number.isFinite(row?.ratio)).toBe(true);
  });

  it('rejects an overflowing planned accumulation with a controlled error', () => {
    expect(() =>
      buildBudgetStatus(
        [
          makeBudget('2026-08', [
            { categoryId: 'extreme', type: 'expense', amount: Number.MAX_VALUE },
            { categoryId: 'extreme', type: 'expense', amount: Number.MAX_VALUE },
          ]),
        ],
        makeSummary(),
        new Date(2026, 7, 1),
        new Date(2026, 7, 31),
      ),
    ).toThrowError(
      new RangeError('A budget status amount must remain finite'),
    );
  });

  it('rejects an overflowing actual accumulation with a controlled error', () => {
    expect(() =>
      buildBudgetStatus(
        [],
        makeSummary([], [
          { categoryId: 'extreme', total: Number.MAX_VALUE },
          { categoryId: 'extreme', total: Number.MAX_VALUE },
        ]),
        new Date(2026, 7, 1),
        new Date(2026, 7, 31),
      ),
    ).toThrowError(
      new RangeError('A budget status amount must remain finite'),
    );
  });

  it('rejects a planned amount whose cent conversion overflows while rounding', () => {
    expect(() =>
      buildBudgetStatus(
        [
          makeBudget('2026-08', [
            {
              categoryId: 'extreme',
              type: 'expense',
              amount: Number.MAX_VALUE / 10,
            },
          ]),
        ],
        makeSummary(),
        new Date(2026, 7, 1),
        new Date(2026, 7, 31),
      ),
    ).toThrowError(
      new RangeError('A budget status amount must remain finite'),
    );
  });

  it('rejects an actual amount whose cent conversion overflows while rounding', () => {
    expect(() =>
      buildBudgetStatus(
        [],
        makeSummary([], [
          { categoryId: 'extreme', total: Number.MAX_VALUE / 10 },
        ]),
        new Date(2026, 7, 1),
        new Date(2026, 7, 31),
      ),
    ).toThrowError(
      new RangeError('A budget status amount must remain finite'),
    );
  });

  it('lists every period month that has no budget', () => {
    const status = buildBudgetStatus(
      [
        makeBudget('2026-07', []),
        makeBudget('2026-08', []),
        makeBudget('2026-11', []),
      ],
      makeSummary(),
      new Date(2026, 7, 15),
      new Date(2026, 9, 2),
    );

    expect(status.missingMonths).toEqual(['2026-09', '2026-10']);
    expect(status.rows).toEqual([]);
  });
});
