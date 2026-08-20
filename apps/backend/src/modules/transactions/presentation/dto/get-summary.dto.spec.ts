import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { GetSummaryDto } from './get-summary.dto';

const validate = (payload: Record<string, unknown>) =>
  validateSync(plainToInstance(GetSummaryDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

describe('GetSummaryDto', () => {
  const valid = {
    from: '2026-08-01T06:00:00.000Z',
    to: '2026-08-31T05:59:59.999Z',
    granularity: 'day',
  };

  it('accepts a valid query', () => {
    expect(validate(valid)).toHaveLength(0);
  });

  it('accepts an optional IANA time zone', () => {
    expect(validate({ ...valid, timeZone: 'America/Mexico_City' })).toHaveLength(
      0,
    );
  });

  it('rejects a granularity outside hour, day and month', () => {
    const errors = validate({ ...valid, granularity: 'week' });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('granularity');
  });

  it('rejects a missing granularity', () => {
    const errors = validate({ from: valid.from, to: valid.to });

    expect(errors.map((error) => error.property)).toContain('granularity');
  });

  it('rejects dates that are not ISO 8601', () => {
    const errors = validate({ ...valid, from: 'yesterday' });

    expect(errors.map((error) => error.property)).toContain('from');
  });

  it('rejects a missing date range', () => {
    const errors = validate({ granularity: 'day' });

    expect(errors.map((error) => error.property).sort()).toEqual(['from', 'to']);
  });

  it('rejects a time zone that is not a real IANA zone', () => {
    const errors = validate({ ...valid, timeZone: 'Mars/Olympus' });

    expect(errors.map((error) => error.property)).toContain('timeZone');
  });
});
