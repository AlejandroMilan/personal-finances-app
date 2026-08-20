import { nextScheduledDate } from './next-scheduled-date.util';

describe('nextScheduledDate', () => {
  it('returns the same day one month later', () => {
    const next = nextScheduledDate(new Date('2026-08-15T10:30:00.000Z'));

    expect(next.toISOString()).toBe('2026-09-15T10:30:00.000Z');
  });

  it('clamps to the last day when the target month is shorter', () => {
    const next = nextScheduledDate(new Date('2026-01-31T00:00:00.000Z'));

    expect(next.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('clamps to february 29th on a leap year', () => {
    const next = nextScheduledDate(new Date('2028-01-31T00:00:00.000Z'));

    expect(next.toISOString()).toBe('2028-02-29T00:00:00.000Z');
  });

  it('rolls over to the next year in december', () => {
    const next = nextScheduledDate(new Date('2026-12-05T08:00:00.000Z'));

    expect(next.toISOString()).toBe('2027-01-05T08:00:00.000Z');
  });

  it('keeps the time of day', () => {
    const next = nextScheduledDate(new Date('2026-03-10T23:59:59.999Z'));

    expect(next.toISOString()).toBe('2026-04-10T23:59:59.999Z');
  });
});
