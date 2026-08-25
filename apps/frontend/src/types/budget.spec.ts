import { describe, expect, it } from 'vitest';
import type {
  Budget,
  BudgetFilters,
  BudgetItem,
  BudgetItemType,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from './budget';

const incomeItem: BudgetItem = {
  categoryId: 'c-income',
  type: 'income',
  amount: 2500,
  note: 'Salary',
};

const expenseItem: BudgetItem = {
  categoryId: 'c-expense',
  type: 'expense',
  amount: 900,
};

const budget: Budget = {
  id: 'b1',
  month: '2026-08',
  items: [incomeItem, expenseItem],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const filters: BudgetFilters = {
  from: '2026-08',
  to: '2026-12',
  limit: 12,
};

const createPayload: CreateBudgetPayload = {
  month: '2026-09',
  items: [expenseItem],
};

const updatePayload: UpdateBudgetPayload = {
  items: [incomeItem],
};

describe('budget API types', () => {
  it('represent both budget item types and optional notes', () => {
    const itemTypes: BudgetItemType[] = ['income', 'expense'];

    expect(itemTypes).toEqual(['income', 'expense']);
    expect(budget.items).toEqual([incomeItem, expenseItem]);
    expect(expenseItem).not.toHaveProperty('note');
  });

  it('represent response metadata, filters, and create/update payloads', () => {
    expect(budget).toMatchObject({
      id: 'b1',
      month: '2026-08',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(filters).toEqual({ from: '2026-08', to: '2026-12', limit: 12 });
    expect(createPayload).toEqual({ month: '2026-09', items: [expenseItem] });
    expect(updatePayload).toEqual({ items: [incomeItem] });
  });
});
