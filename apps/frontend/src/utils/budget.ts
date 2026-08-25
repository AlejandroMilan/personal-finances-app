import type { Budget, BudgetItemType } from '../types/budget';
import type {
  CategoryTotalView,
  TransactionsSummaryView,
} from '../types/summary';

export interface BudgetStatusRow {
  categoryId: string | null;
  type: BudgetItemType;
  planned: number;
  actual: number;
  ratio: number;
  remaining: number;
  unbudgeted: boolean;
}

export interface BudgetStatus {
  rows: BudgetStatusRow[];
  missingMonths: string[];
}

type BudgetSummary = Pick<TransactionsSummaryView, 'byCategory'>;

/** Identificador mensual basado en la fecha local del navegador. */
export function monthKey(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('A valid date is required');
  }

  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const MONTH_KEY_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export interface MonthParts {
  year: number;
  month: number;
}

/** Descompone un identificador mensual `YYYY-MM`; devuelve `null` si no lo es. */
export function parseMonthKey(value: string): MonthParts | null {
  const match = MONTH_KEY_PATTERN.exec(value);
  if (!match) return null;

  return { year: Number(match[1]), month: Number(match[2]) };
}

/** Compone un identificador mensual a partir de un año y un mes 1..12. */
export function buildMonthKey(year: number, month: number): string {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError('A month key needs a year between 1 and 9999');
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('A month key needs a month between 1 and 12');
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

/** Devuelve todos los meses calendario tocados por un rango, incluidos ambos extremos. */
export function monthsInPeriod(from: Date, to: Date): string[] {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new RangeError('A period needs two valid dates');
  }

  if (from.getTime() > to.getTime()) {
    throw new RangeError('The start date must not be after the end date');
  }

  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  const months: string[] = [];
  while (cursor.getTime() <= end.getTime()) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months;
}

interface BudgetStatusAccumulator {
  categoryId: string | null;
  type: BudgetItemType;
  planned: number;
  actual: number;
}

function statusKey(categoryId: string | null, type: BudgetItemType): string {
  return JSON.stringify([type, categoryId]);
}

function assertFinite(value: number, message: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(message);
  }

  return value;
}

function addMoney(current: number, amount: number): number {
  return assertFinite(
    current + amount,
    'A budget status amount must remain finite',
  );
}

function roundMoney(value: number): number {
  assertFinite(value, 'A budget status amount must remain finite');
  const cents = assertFinite(
    value * 100,
    'A budget status amount must remain finite',
  );
  const rounded = Math.round(cents) / 100;

  return assertFinite(rounded, 'A budget status amount must remain finite');
}

function ratioFor(planned: number, actual: number): number {
  assertFinite(planned, 'A budget status amount must remain finite');
  assertFinite(actual, 'A budget status amount must remain finite');

  if (planned === 0) return 0;

  const ratio = actual / planned;
  return assertFinite(ratio, 'A budget status ratio must remain finite');
}

function remainingFor(planned: number, actual: number): number {
  const remaining = assertFinite(
    planned - actual,
    'A budget status remaining amount must remain finite',
  );

  return roundMoney(remaining);
}

function toRow(accumulator: BudgetStatusAccumulator): BudgetStatusRow {
  const planned = roundMoney(accumulator.planned);
  const actual = roundMoney(accumulator.actual);

  return {
    categoryId: accumulator.categoryId,
    type: accumulator.type,
    planned,
    actual,
    ratio: ratioFor(planned, actual),
    remaining: remainingFor(planned, actual),
    unbudgeted: planned === 0,
  };
}

/** Cruza el presupuesto de los meses del periodo con los totales reales del resumen. */
export function buildBudgetStatus(
  budgets: readonly Budget[],
  summary: BudgetSummary,
  from: Date,
  to: Date,
): BudgetStatus {
  const months = monthsInPeriod(from, to);
  const periodMonths = new Set(months);
  const budgetedMonths = new Set(
    budgets
      .filter((budget) => periodMonths.has(budget.month))
      .map((budget) => budget.month),
  );
  const missingMonths = months.filter((month) => !budgetedMonths.has(month));
  const accumulators = new Map<string, BudgetStatusAccumulator>();

  const getAccumulator = (
    categoryId: string | null,
    type: BudgetItemType,
  ): BudgetStatusAccumulator => {
    const key = statusKey(categoryId, type);
    const existing = accumulators.get(key);
    if (existing) return existing;

    const created: BudgetStatusAccumulator = {
      categoryId,
      type,
      planned: 0,
      actual: 0,
    };
    accumulators.set(key, created);
    return created;
  };

  budgets
    .filter((budget) => periodMonths.has(budget.month))
    .forEach((budget) => {
      budget.items.forEach((item) => {
        const accumulator = getAccumulator(item.categoryId, item.type);
        accumulator.planned = addMoney(accumulator.planned, item.amount);
      });
    });

  const addActuals = (
    type: BudgetItemType,
    totals: readonly CategoryTotalView[],
  ): void => {
    totals.forEach((total) => {
      if (total.total === 0) return;
      const accumulator = getAccumulator(total.categoryId, type);
      accumulator.actual = addMoney(accumulator.actual, total.total);
    });
  };

  addActuals('income', summary.byCategory.income);
  addActuals('expense', summary.byCategory.expense);

  return {
    rows: Array.from(accumulators.values()).map(toRow),
    missingMonths,
  };
}
