import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import { BudgetItemDto } from './budget-item.dto';
import { CreateBudgetDto } from './create-budget.dto';

const validate = (payload: Record<string, unknown>) => {
  const instance = plainToInstance(CreateBudgetDto, payload);
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  return { instance, errors };
};

describe('CreateBudgetDto', () => {
  const valid = {
    month: '2026-08',
    items: [
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 250,
      },
    ],
  };

  it('accepts a valid monthly budget payload', () => {
    expect(validate(valid).errors).toHaveLength(0);
  });

  it.each(['', '2026', '2026-1', '2026-00', '2026-13', '26-08'])(
    'rejects the invalid month %p',
    (month) => {
      const { errors } = validate({ ...valid, month });

      expect(errors.map((error) => error.property)).toContain('month');
    },
  );

  it('validates nested budget items', () => {
    const { errors } = validate({
      ...valid,
      items: [{ ...valid.items[0], type: 'transfer' }],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('items');
    expect(errors[0].children?.[0].children?.map((error) => error.property)).toContain(
      'type',
    );
  });

  it('transforms nested items and removes userId from the request body', () => {
    const { instance } = validate({
      ...valid,
      userId: 'body-user',
    });

    expect(instance.items[0]).toBeInstanceOf(BudgetItemDto);
    expect(instance).not.toHaveProperty('userId');
  });
});
