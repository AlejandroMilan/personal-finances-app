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

const validItem = {
  categoryId: 'c1',
  type: BudgetItemType.EXPENSE,
  amount: 250,
};

const manyItems = (count: number, note?: string) =>
  Array.from({ length: count }, (_, index) => ({
    ...validItem,
    categoryId: `c${index}`,
    ...(note === undefined ? {} : { note }),
  }));

describe('UpdateBudgetDto', () => {
  const items = [validItem];

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

  it('rejects a replacement list with more than 100 items', () => {
    const { errors } = validate({ items: manyItems(101) });

    expect(errors.map((error) => error.property)).toContain('items');
  });

  it('accepts 100 replacement items with a 500-character nested note', () => {
    const { errors } = validate({
      items: manyItems(100, 'x'.repeat(500)),
    });

    expect(errors).toHaveLength(0);
  });

  it('transforms nested items and removes userId from the request body', () => {
    const { instance } = validate({ items, userId: 'body-user' });

    expect(instance.items[0]).toBeInstanceOf(BudgetItemDto);
    expect(instance).not.toHaveProperty('userId');
  });
});
