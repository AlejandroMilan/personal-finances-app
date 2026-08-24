import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ListBudgetsDto } from './list-budgets.dto';

const validate = (payload: Record<string, unknown>) => {
  const instance = plainToInstance(ListBudgetsDto, payload);
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  return { instance, errors };
};

describe('ListBudgetsDto', () => {
  it('accepts an empty query and valid month boundaries', () => {
    expect(validate({}).errors).toHaveLength(0);
    expect(
      validate({ from: '2026-01', to: '2026-12' }).errors,
    ).toHaveLength(0);
  });

  it.each([1, 20, 100])(
    'accepts an integer limit in the range 1..100: %p',
    (limit) => {
      const { instance, errors } = validate({ limit });

      expect(errors).toHaveLength(0);
      expect(instance.limit).toBe(limit);
    },
  );

  it('transforms a numeric query-string limit before validating it', () => {
    const { instance, errors } = validate({ limit: '20' });

    expect(errors).toHaveLength(0);
    expect(instance.limit).toBe(20);
  });

  it.each([0, 101, 1.5, NaN, Infinity])(
    'rejects a limit outside the positive integer range: %p',
    (limit) => {
      const { errors } = validate({ limit });

      expect(errors.map((error) => error.property)).toContain('limit');
    },
  );

  it.each(['2026-00', '2026-13', '2026-1', 'not-a-month'])(
    'rejects an invalid from month %p',
    (from) => {
      const { errors } = validate({ from });

      expect(errors.map((error) => error.property)).toContain('from');
    },
  );

  it('rejects an invalid to month', () => {
    const { errors } = validate({ to: '2026-13' });

    expect(errors.map((error) => error.property)).toContain('to');
  });

  it('removes unknown query fields by whitelist validation', () => {
    const { instance } = validate({
      from: '2026-01',
      userId: 'query-user',
      page: 2,
    });

    expect(instance).not.toHaveProperty('userId');
    expect(instance).not.toHaveProperty('page');
  });
});
