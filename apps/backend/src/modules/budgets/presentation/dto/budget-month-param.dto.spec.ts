import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BudgetMonthParamDto } from './budget-month-param.dto';

const validate = (payload: Record<string, unknown>) =>
  validateSync(plainToInstance(BudgetMonthParamDto, payload), {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

describe('BudgetMonthParamDto', () => {
  it('accepts a YYYY-MM month', () => {
    expect(validate({ month: '2026-08' })).toHaveLength(0);
  });

  it.each(['', '2026', '2026-1', '2026-00', '2026-13', '2026-08-extra'])(
    'rejects the malformed month %p',
    (month) => {
      expect(validate({ month })).not.toHaveLength(0);
    },
  );

  it('removes an undeclared userId from route params', () => {
    const instance = plainToInstance(BudgetMonthParamDto, {
      month: '2026-08',
      userId: 'route-user',
    });

    validateSync(instance, { whitelist: true });

    expect(instance).not.toHaveProperty('userId');
  });
});
