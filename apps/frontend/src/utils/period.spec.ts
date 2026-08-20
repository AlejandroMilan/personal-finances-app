import { describe, expect, it } from 'vitest';
import {
  buildCustomPeriodRange,
  buildPeriodRange,
  currentTimeZone,
  parseDateInput,
  resolveGranularity,
  toDateInput,
} from './period';

/** Jueves 20 de agosto de 2026, 15:47 hora local. */
const now = new Date(2026, 7, 20, 15, 47, 31, 500);

const localParts = (date: Date) => ({
  year: date.getFullYear(),
  month: date.getMonth(),
  day: date.getDate(),
  hours: date.getHours(),
  minutes: date.getMinutes(),
  seconds: date.getSeconds(),
  ms: date.getMilliseconds(),
});

describe('buildPeriodRange', () => {
  it('returns the current day from local midnight to the last millisecond', () => {
    const range = buildPeriodRange('day', now);

    expect(localParts(range.from)).toEqual({
      year: 2026,
      month: 7,
      day: 20,
      hours: 0,
      minutes: 0,
      seconds: 0,
      ms: 0,
    });
    expect(localParts(range.to)).toEqual({
      year: 2026,
      month: 7,
      day: 20,
      hours: 23,
      minutes: 59,
      seconds: 59,
      ms: 999,
    });
    expect(range.kind).toBe('day');
  });

  it('starts the week on Monday and ends it on Sunday', () => {
    const range = buildPeriodRange('week', now);

    // El 20/08/2026 es jueves: la semana va del lunes 17 al domingo 23.
    expect(range.from.getDate()).toBe(17);
    expect(range.from.getDay()).toBe(1);
    expect(range.to.getDate()).toBe(23);
    expect(range.to.getDay()).toBe(0);
    expect(range.from.getHours()).toBe(0);
    expect(range.to.getHours()).toBe(23);
  });

  it('keeps the week inside the previous month when it straddles two months', () => {
    // Miércoles 2 de septiembre de 2026: la semana empieza el lunes 31 de agosto.
    const range = buildPeriodRange('week', new Date(2026, 8, 2, 10, 0, 0));

    expect(range.from.getMonth()).toBe(7);
    expect(range.from.getDate()).toBe(31);
    expect(range.to.getMonth()).toBe(8);
    expect(range.to.getDate()).toBe(6);
  });

  it('returns the current month from the first to the last day', () => {
    const range = buildPeriodRange('month', now);

    expect(range.from.getDate()).toBe(1);
    expect(range.from.getMonth()).toBe(7);
    expect(range.to.getDate()).toBe(31);
    expect(range.to.getMonth()).toBe(7);
  });

  it('handles a month shorter than 31 days', () => {
    const range = buildPeriodRange('month', new Date(2026, 1, 10, 12, 0, 0));

    expect(range.to.getMonth()).toBe(1);
    expect(range.to.getDate()).toBe(28);
  });

  it('returns the current year from January 1st to December 31st', () => {
    const range = buildPeriodRange('year', now);

    expect(range.from.getMonth()).toBe(0);
    expect(range.from.getDate()).toBe(1);
    expect(range.to.getMonth()).toBe(11);
    expect(range.to.getDate()).toBe(31);
    expect(range.to.getFullYear()).toBe(2026);
  });

  it('defaults to the present when no reference date is given', () => {
    const range = buildPeriodRange('month');

    expect(range.from.getMonth()).toBe(new Date().getMonth());
  });
});

describe('resolveGranularity', () => {
  it('maps each preset to its granularity', () => {
    expect(resolveGranularity('day')).toBe('hour');
    expect(resolveGranularity('week')).toBe('day');
    expect(resolveGranularity('month')).toBe('day');
    expect(resolveGranularity('year')).toBe('month');
  });

  it('groups a short custom range by hour', () => {
    expect(
      resolveGranularity('custom', new Date(2026, 7, 1), new Date(2026, 7, 3)),
    ).toBe('hour');
  });

  it('groups a mid sized custom range by day', () => {
    expect(
      resolveGranularity('custom', new Date(2026, 7, 1), new Date(2026, 8, 15)),
    ).toBe('day');
  });

  it('groups a long custom range by month', () => {
    expect(
      resolveGranularity('custom', new Date(2025, 0, 1), new Date(2026, 0, 1)),
    ).toBe('month');
  });

  it('switches to day exactly after the two day mark', () => {
    const from = new Date(2026, 7, 1, 0, 0, 0, 0);
    const justOverTwoDays = new Date(2026, 7, 3, 0, 0, 1, 0);

    expect(resolveGranularity('custom', from, justOverTwoDays)).toBe('day');
  });

  it('requires both dates for a custom period', () => {
    expect(() => resolveGranularity('custom')).toThrow(RangeError);
  });
});

describe('buildCustomPeriodRange', () => {
  it('expands the selection to whole local days', () => {
    const range = buildCustomPeriodRange(
      new Date(2026, 7, 1, 18, 30, 0),
      new Date(2026, 7, 5, 9, 15, 0),
    );

    expect(localParts(range.from).hours).toBe(0);
    expect(localParts(range.to).hours).toBe(23);
    expect(range.to.getDate()).toBe(5);
    expect(range.kind).toBe('custom');
    expect(range.granularity).toBe('day');
  });

  it('accepts a single day selection', () => {
    const day = new Date(2026, 7, 20, 12, 0, 0);
    const range = buildCustomPeriodRange(day, day);

    expect(range.from.getDate()).toBe(20);
    expect(range.to.getDate()).toBe(20);
    expect(range.granularity).toBe('hour');
  });

  it('rejects a start date after the end date', () => {
    expect(() =>
      buildCustomPeriodRange(new Date(2026, 7, 10), new Date(2026, 7, 1)),
    ).toThrow('The start date must not be after the end date');
  });

  it('rejects invalid dates', () => {
    expect(() =>
      buildCustomPeriodRange(new Date('nope'), new Date(2026, 7, 1)),
    ).toThrow(RangeError);
  });
});

describe('currentTimeZone', () => {
  it('returns the IANA zone resolved by the browser', () => {
    const zone = currentTimeZone();

    expect(typeof zone).toBe('string');
    expect(zone.length).toBeGreaterThan(0);
    expect(() =>
      new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date()),
    ).not.toThrow();
  });
});

describe('parseDateInput', () => {
  it('reads a date input value as a local date', () => {
    const date = parseDateInput('2026-08-01');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(1);
    expect(date.getHours()).toBe(0);
  });

  it('returns an invalid date for an empty or malformed value', () => {
    expect(Number.isNaN(parseDateInput('').getTime())).toBe(true);
    expect(Number.isNaN(parseDateInput('nope').getTime())).toBe(true);
  });
});

describe('toDateInput', () => {
  it('formats a local date for a date input', () => {
    expect(toDateInput(new Date(2026, 7, 1))).toBe('2026-08-01');
    expect(toDateInput(new Date(2026, 11, 25))).toBe('2026-12-25');
  });

  it('round trips with parseDateInput', () => {
    const value = '2026-02-28';

    expect(toDateInput(parseDateInput(value))).toBe(value);
  });
});
