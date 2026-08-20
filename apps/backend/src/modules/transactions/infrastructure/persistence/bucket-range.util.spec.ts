import {
  addBucket,
  buildBucketSequence,
  roundToCents,
  truncateToBucket,
} from './bucket-range.util';

const MEXICO = 'America/Mexico_City';
const MADRID = 'Europe/Madrid';

describe('bucket-range.util', () => {
  describe('truncateToBucket', () => {
    it('truncates to the start of the local hour', () => {
      const result = truncateToBucket(
        new Date('2026-08-20T15:47:31.500Z'),
        'hour',
        MEXICO,
      );

      expect(result.toISOString()).toBe('2026-08-20T15:00:00.000Z');
    });

    it('truncates to the start of the local day, not the UTC day', () => {
      // 2026-08-20T03:00Z es todavía el 19 de agosto a las 21:00 en México.
      const result = truncateToBucket(
        new Date('2026-08-20T03:00:00.000Z'),
        'day',
        MEXICO,
      );

      expect(result.toISOString()).toBe('2026-08-19T06:00:00.000Z');
    });

    it('truncates to the first day of the local month', () => {
      const result = truncateToBucket(
        new Date('2026-08-20T18:00:00.000Z'),
        'month',
        MEXICO,
      );

      expect(result.toISOString()).toBe('2026-08-01T06:00:00.000Z');
    });

    it('keeps midnight aligned across a daylight saving change', () => {
      // Madrid pasa a horario de verano el 29/03/2026: de UTC+1 a UTC+2.
      const before = truncateToBucket(
        new Date('2026-03-28T12:00:00.000Z'),
        'day',
        MADRID,
      );
      const after = truncateToBucket(
        new Date('2026-03-30T12:00:00.000Z'),
        'day',
        MADRID,
      );

      expect(before.toISOString()).toBe('2026-03-27T23:00:00.000Z');
      expect(after.toISOString()).toBe('2026-03-29T22:00:00.000Z');
    });
  });

  describe('addBucket', () => {
    it('advances one hour', () => {
      const result = addBucket(
        new Date('2026-08-20T15:00:00.000Z'),
        'hour',
        MEXICO,
      );

      expect(result.toISOString()).toBe('2026-08-20T16:00:00.000Z');
    });

    it('advances to the next local midnight', () => {
      const result = addBucket(
        new Date('2026-08-19T06:00:00.000Z'),
        'day',
        MEXICO,
      );

      expect(result.toISOString()).toBe('2026-08-20T06:00:00.000Z');
    });

    it('advances a 23 hour day when daylight saving starts', () => {
      const start = new Date('2026-03-28T23:00:00.000Z'); // 29/03 00:00 en Madrid
      const next = addBucket(start, 'day', MADRID);

      expect(next.toISOString()).toBe('2026-03-29T22:00:00.000Z');
      expect(next.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
    });

    it('advances across a year boundary for months', () => {
      const result = addBucket(
        new Date('2026-12-01T06:00:00.000Z'),
        'month',
        MEXICO,
      );

      expect(result.toISOString()).toBe('2027-01-01T06:00:00.000Z');
    });
  });

  describe('buildBucketSequence', () => {
    it('covers the range with one bucket per local day, in chronological order', () => {
      const buckets = buildBucketSequence(
        new Date('2026-08-01T06:00:00.000Z'),
        new Date('2026-08-06T05:59:59.999Z'),
        'day',
        MEXICO,
      );

      expect(buckets).toHaveLength(5);
      expect(buckets[0].toISOString()).toBe('2026-08-01T06:00:00.000Z');
      expect(buckets[4].toISOString()).toBe('2026-08-05T06:00:00.000Z');
      const timestamps = buckets.map((bucket) => bucket.getTime());
      expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
    });

    it('starts on the bucket that contains `from` even when it is mid interval', () => {
      const buckets = buildBucketSequence(
        new Date('2026-08-01T15:30:00.000Z'),
        new Date('2026-08-01T17:00:00.000Z'),
        'hour',
        MEXICO,
      );

      expect(buckets.map((bucket) => bucket.toISOString())).toEqual([
        '2026-08-01T15:00:00.000Z',
        '2026-08-01T16:00:00.000Z',
        '2026-08-01T17:00:00.000Z',
      ]);
    });

    it('returns one bucket per month for a whole year', () => {
      const buckets = buildBucketSequence(
        new Date('2026-01-01T06:00:00.000Z'),
        new Date('2026-12-31T23:59:59.999Z'),
        'month',
        MEXICO,
      );

      expect(buckets).toHaveLength(12);
    });

    it('returns an empty sequence when `to` precedes the first bucket', () => {
      const buckets = buildBucketSequence(
        new Date('2026-08-10T00:00:00.000Z'),
        new Date('2026-08-01T00:00:00.000Z'),
        'day',
        MEXICO,
      );

      expect(buckets).toEqual([]);
    });

    it('throws instead of exhausting memory when the range is too wide', () => {
      expect(() =>
        buildBucketSequence(
          new Date('2020-01-01T00:00:00.000Z'),
          new Date('2030-01-01T00:00:00.000Z'),
          'hour',
          MEXICO,
        ),
      ).toThrow(RangeError);
    });

    it('honours a custom bucket limit', () => {
      expect(() =>
        buildBucketSequence(
          new Date('2026-08-01T06:00:00.000Z'),
          new Date('2026-08-31T06:00:00.000Z'),
          'day',
          MEXICO,
          5,
        ),
      ).toThrow('more than 5 buckets');
    });
  });

  describe('roundToCents', () => {
    it('closes floating point drift to cents', () => {
      expect(roundToCents(0.1 + 0.2)).toBe(0.3);
      expect(roundToCents(10.005)).toBe(10.01);
      expect(roundToCents(0)).toBe(0);
    });
  });
});
