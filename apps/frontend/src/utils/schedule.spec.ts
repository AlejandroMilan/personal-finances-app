import { describe, expect, it } from 'vitest';
import type { ScheduledTransactionView } from '../types/scheduled-transaction';
import {
  endOfMonth,
  fromDateInputValue,
  isInCurrentMonth,
  isOverdue,
  sortByScheduledFor,
  splitPendingSchedule,
  startOfMonth,
  suggestedNextDate,
  toDateInputValue,
} from './schedule';

const scheduled = (
  overrides: Partial<ScheduledTransactionView> = {},
): ScheduledTransactionView => ({
  id: 's1',
  accountId: 'a1',
  destinationAccountId: null,
  categoryId: 'c1',
  type: 'expense',
  title: 'Rent',
  amount: 12000,
  tags: [],
  scheduledFor: '2026-08-15T00:00:00.000',
  recurring: true,
  status: 'pending',
  transactionId: null,
  ...overrides,
});

const now = new Date(2026, 7, 20, 10, 0, 0);

describe('isOverdue', () => {
  it('marks a scheduled transaction from a previous day as overdue', () => {
    expect(isOverdue(scheduled({ scheduledFor: '2026-08-19T23:00:00' }), now)).toBe(
      true,
    );
  });

  it('does not mark today as overdue, even earlier in the day', () => {
    expect(isOverdue(scheduled({ scheduledFor: '2026-08-20T00:00:00' }), now)).toBe(
      false,
    );
  });

  it('does not mark a future date as overdue', () => {
    expect(isOverdue(scheduled({ scheduledFor: '2026-09-01T00:00:00' }), now)).toBe(
      false,
    );
  });

  it('defaults to the current date', () => {
    expect(isOverdue(scheduled({ scheduledFor: '2000-01-01T00:00:00' }))).toBe(true);
  });
});

describe('isInCurrentMonth', () => {
  it('accepts a date within the same month and year', () => {
    expect(
      isInCurrentMonth(scheduled({ scheduledFor: '2026-08-31T00:00:00' }), now),
    ).toBe(true);
  });

  it('rejects the next month', () => {
    expect(
      isInCurrentMonth(scheduled({ scheduledFor: '2026-09-01T00:00:00' }), now),
    ).toBe(false);
  });

  it('rejects the same month of another year', () => {
    expect(
      isInCurrentMonth(scheduled({ scheduledFor: '2025-08-20T00:00:00' }), now),
    ).toBe(false);
  });

  it('defaults to the current date', () => {
    expect(isInCurrentMonth(scheduled({ scheduledFor: '1999-08-01T00:00:00' }))).toBe(
      false,
    );
  });
});

describe('sortByScheduledFor', () => {
  it('sorts ascending without mutating the input', () => {
    const items = [
      scheduled({ id: 'b', scheduledFor: '2026-09-01T00:00:00' }),
      scheduled({ id: 'a', scheduledFor: '2026-08-01T00:00:00' }),
    ];

    const sorted = sortByScheduledFor(items);

    expect(sorted.map((item) => item.id)).toEqual(['a', 'b']);
    expect(items.map((item) => item.id)).toEqual(['b', 'a']);
  });
});

describe('splitPendingSchedule', () => {
  const items = [
    scheduled({ id: 'future', scheduledFor: '2026-09-10T00:00:00' }),
    scheduled({ id: 'overdue', scheduledFor: '2026-08-01T00:00:00' }),
    scheduled({ id: 'today', scheduledFor: '2026-08-20T00:00:00' }),
    scheduled({ id: 'later-this-month', scheduledFor: '2026-08-28T00:00:00' }),
    scheduled({
      id: 'executed',
      scheduledFor: '2026-08-02T00:00:00',
      status: 'executed',
    }),
    scheduled({
      id: 'cancelled',
      scheduledFor: '2026-08-03T00:00:00',
      status: 'cancelled',
    }),
  ];

  it('separates overdue from the rest of the current month', () => {
    const buckets = splitPendingSchedule(items, now);

    expect(buckets.overdue.map((item) => item.id)).toEqual(['overdue']);
    expect(buckets.currentMonth.map((item) => item.id)).toEqual([
      'today',
      'later-this-month',
    ]);
  });

  it('drops what is not pending and what falls beyond the month', () => {
    const buckets = splitPendingSchedule(items, now);
    const ids = [...buckets.overdue, ...buckets.currentMonth].map(
      (item) => item.id,
    );

    expect(ids).not.toContain('executed');
    expect(ids).not.toContain('cancelled');
    expect(ids).not.toContain('future');
  });

  it('returns empty buckets when there is nothing pending', () => {
    const buckets = splitPendingSchedule([], now);

    expect(buckets.overdue).toEqual([]);
    expect(buckets.currentMonth).toEqual([]);
  });

  it('defaults to the current date', () => {
    expect(splitPendingSchedule(items).overdue.length).toBeGreaterThanOrEqual(0);
  });
});

describe('suggestedNextDate', () => {
  it('returns the same day one month later', () => {
    const next = suggestedNextDate('2026-08-15T09:30:00');

    expect(toDateInputValue(next)).toBe('2026-09-15');
    expect(next.getHours()).toBe(9);
    expect(next.getMinutes()).toBe(30);
  });

  it('clamps to the last day when the target month is shorter', () => {
    expect(toDateInputValue(suggestedNextDate('2026-01-31T00:00:00'))).toBe(
      '2026-02-28',
    );
  });

  it('clamps to february 29th on a leap year', () => {
    expect(toDateInputValue(suggestedNextDate('2028-01-31T00:00:00'))).toBe(
      '2028-02-29',
    );
  });

  it('rolls over to the next year in december', () => {
    expect(toDateInputValue(suggestedNextDate('2026-12-05T00:00:00'))).toBe(
      '2027-01-05',
    );
  });

  it('accepts a Date as well as a string', () => {
    expect(toDateInputValue(suggestedNextDate(new Date(2026, 7, 15)))).toBe(
      '2026-09-15',
    );
  });
});

describe('date input helpers', () => {
  it('formats a date padding month and day', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parses an input value into the local start of the day', () => {
    const parsed = fromDateInputValue('2026-03-09');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(9);
    expect(parsed.getHours()).toBe(0);
  });

  it('round trips a date through both helpers', () => {
    expect(toDateInputValue(fromDateInputValue('2026-11-30'))).toBe('2026-11-30');
  });
});

describe('month bounds', () => {
  it('returns the first instant of the month', () => {
    const start = startOfMonth(now);

    expect(toDateInputValue(start)).toBe('2026-08-01');
    expect(start.getHours()).toBe(0);
  });

  it('returns the last instant of the month', () => {
    const end = endOfMonth(now);

    expect(toDateInputValue(end)).toBe('2026-08-31');
    expect(end.getMilliseconds()).toBe(999);
  });

  it('handles february in a leap year', () => {
    expect(toDateInputValue(endOfMonth(new Date(2028, 1, 10)))).toBe('2028-02-29');
  });
});
