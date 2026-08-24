import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import { BudgetItemDto } from './budget-item.dto';
import { UpdateBudgetDto } from './update-budget.dto';

const validate = (payload: Record<string, unknown>) => {
  const instance = plainToInstance(UpdateBudgetDto, payload);
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  return { instance, errors };
};

describe('UpdateBudgetDto', () => {
  const items = [
    {
      categoryId: 'c1',
      type: BudgetItemType.EXPENSE,
      amount: 250,
    },
  ];

  it('accepts a complete replacement list of items', () => {
    expect(validate({ items }).errors).toHaveLength(0);
  });

  it('rejects a replacement item with a non-positive amount', () => {
    const { errors } = validate({ items: [{ ...items[0], amount: 0 }] });

    expect(errors).toHaveLength(1);
    expect(errors[0].children?.[0].children?.map((error) => error.property)).toContain(
      'amount',
    );
  });

  it('transforms nested items and removes userId from the request body', () => {
    const { instance } = validate({ items, userId: 'body-user' });

    expect(instance.items[0]).toBeInstanceOf(BudgetItemDto);
    expect(instance).not.toHaveProperty('userId');
  });
});
