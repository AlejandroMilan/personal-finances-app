import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import { BudgetItemDto } from './budget-item.dto';

const validate = (payload: Record<string, unknown>) => {
  const instance = plainToInstance(BudgetItemDto, payload);
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  return { instance, errors };
};

describe('BudgetItemDto', () => {
  const valid = {
    categoryId: 'c1',
    type: BudgetItemType.EXPENSE,
    amount: 250,
    note: 'Rent',
  };

  it('accepts a valid expense item', () => {
    expect(validate(valid).errors).toHaveLength(0);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects an amount of %p',
    (amount) => {
      const { errors } = validate({ ...valid, amount });

      expect(errors.map((error) => error.property)).toContain('amount');
    },
  );

  it('rejects a type outside income and expense', () => {
    const { errors } = validate({ ...valid, type: 'transfer' });

    expect(errors.map((error) => error.property)).toContain('type');
  });

  it('rejects a blank category id', () => {
    const { errors } = validate({ ...valid, categoryId: '' });

    expect(errors.map((error) => error.property)).toContain('categoryId');
  });

  it('rejects a note longer than 500 characters', () => {
    const { errors } = validate({ ...valid, note: 'x'.repeat(501) });

    expect(errors.map((error) => error.property)).toContain('note');
  });

  it('accepts a note with exactly 500 characters', () => {
    const { errors } = validate({ ...valid, note: 'x'.repeat(500) });

    expect(errors).toHaveLength(0);
  });

  it('removes undeclared fields with the whitelist validation option', () => {
    const { instance } = validate({
      ...valid,
      userId: 'body-user',
      unexpected: 'discard me',
    });

    expect(instance).not.toHaveProperty('userId');
    expect(instance).not.toHaveProperty('unexpected');
  });
});
