import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/budgets', () => ({
  budgetsService: {
    list: vi.fn(),
    getByMonth: vi.fn(),
    template: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { budgetsService } from '../services/budgets';
import type { Budget, BudgetItem, CreateBudgetPayload } from '../types/budget';
import { useBudgetsStore } from './budgets';

const item: BudgetItem = {
  categoryId: 'c1',
  type: 'expense',
  amount: 900,
  note: 'Rent',
};

const updatedItem: BudgetItem = { ...item, amount: 950 };

const augustBudget: Budget = {
  id: 'b1',
  month: '2026-08',
  items: [item],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const septemberBudget: Budget = {
  ...augustBudget,
  id: 'b2',
  month: '2026-09',
  items: [updatedItem],
};

const payload: CreateBudgetPayload = {
  month: '2026-08',
  items: [item],
};

const template: BudgetItem[] = [
  { categoryId: 'c1', type: 'expense', amount: 1200, note: 'Rent (agenda)' },
];

describe('budgets store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('starts with no selected month, budget, or template', () => {
    const store = useBudgetsStore();

    expect(store.budgets).toEqual([]);
    expect(store.month).toBeNull();
    expect(store.budget).toBeNull();
    expect(store.template).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('fetches and stores the list of budgets for the selector', async () => {
    vi.mocked(budgetsService.list).mockResolvedValue([augustBudget, septemberBudget]);
    const store = useBudgetsStore();

    await store.fetchBudgets();

    expect(budgetsService.list).toHaveBeenCalledWith();
    expect(store.budgets).toEqual([augustBudget, septemberBudget]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('passes period filters to the budget service when fetching a bounded list', async () => {
    vi.mocked(budgetsService.list).mockResolvedValue([augustBudget]);
    const store = useBudgetsStore();
    const filters = { from: '2026-01', to: '2026-08', limit: 100 };

    await store.fetchBudgets(filters);

    expect(budgetsService.list).toHaveBeenCalledWith(filters);
    expect(store.budgets).toEqual([augustBudget]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('clears the budget list and exposes an Error message when listing fails', async () => {
    vi.mocked(budgetsService.list).mockRejectedValue(new Error('List unavailable'));
    const store = useBudgetsStore();
    store.budgets = [augustBudget];

    await store.fetchBudgets();

    expect(store.budgets).toEqual([]);
    expect(store.error).toBe('List unavailable');
    expect(store.loading).toBe(false);
  });

  it('uses a generic message for a non-Error listing failure', async () => {
    vi.mocked(budgetsService.list).mockRejectedValue('list failed');
    const store = useBudgetsStore();

    await store.fetchBudgets();

    expect(store.error).toBe('Could not load budgets');
    expect(store.loading).toBe(false);
  });

  it('fetches and stores the budget for the selected month', async () => {
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(augustBudget);
    const store = useBudgetsStore();

    await store.fetchForMonth('2026-08');

    expect(budgetsService.getByMonth).toHaveBeenCalledWith('2026-08');
    expect(store.month).toBe('2026-08');
    expect(store.budget).toEqual(augustBudget);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('keeps a missing month distinguishable from a failed request', async () => {
    vi.mocked(budgetsService.getByMonth).mockResolvedValue(null);
    const store = useBudgetsStore();

    await store.fetchForMonth('2026-10');

    expect(store.month).toBe('2026-10');
    expect(store.budget).toBeNull();
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('exposes an Error message and clears the budget when fetching fails', async () => {
    vi.mocked(budgetsService.getByMonth).mockRejectedValue(
      new Error('Budget service unavailable'),
    );
    const store = useBudgetsStore();
    store.budget = augustBudget;

    await store.fetchForMonth('2026-08');

    expect(store.budget).toBeNull();
    expect(store.error).toBe('Budget service unavailable');
    expect(store.loading).toBe(false);
  });

  it('uses a generic message for a non-Error fetch failure', async () => {
    vi.mocked(budgetsService.getByMonth).mockRejectedValue('network down');
    const store = useBudgetsStore();

    await store.fetchForMonth('2026-08');

    expect(store.error).toBe('Could not load the budget');
    expect(store.loading).toBe(false);
  });

  it('fetches and returns the schedule-derived template', async () => {
    vi.mocked(budgetsService.template).mockResolvedValue(template);
    const store = useBudgetsStore();

    await expect(store.fetchTemplate('2026-08')).resolves.toEqual(template);

    expect(budgetsService.template).toHaveBeenCalledWith('2026-08');
    expect(store.month).toBe('2026-08');
    expect(store.template).toEqual(template);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('records and rethrows template errors', async () => {
    const error = new Error('Template service unavailable');
    vi.mocked(budgetsService.template).mockRejectedValue(error);
    const store = useBudgetsStore();
    store.template = template;

    await expect(store.fetchTemplate('2026-08')).rejects.toBe(error);

    expect(store.template).toEqual([]);
    expect(store.error).toBe('Template service unavailable');
    expect(store.loading).toBe(false);
  });

  it('uses a generic message for a non-Error template failure', async () => {
    vi.mocked(budgetsService.template).mockRejectedValue('template failed');
    const store = useBudgetsStore();

    await expect(store.fetchTemplate('2026-08')).rejects.toBe('template failed');

    expect(store.error).toBe('Could not load the budget template');
    expect(store.loading).toBe(false);
  });

  it('creates a budget when the selected month has no saved budget', async () => {
    vi.mocked(budgetsService.create).mockResolvedValue(augustBudget);
    const store = useBudgetsStore();

    await store.save(payload);

    expect(budgetsService.create).toHaveBeenCalledWith(payload);
    expect(budgetsService.update).not.toHaveBeenCalled();
    expect(store.month).toBe('2026-08');
    expect(store.budget).toEqual(augustBudget);
    expect(store.budgets).toEqual([augustBudget]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('updates the existing budget when saving its same month', async () => {
    vi.mocked(budgetsService.update).mockResolvedValue(septemberBudget);
    const store = useBudgetsStore();
    store.budget = augustBudget;

    await store.save({ ...payload, items: [updatedItem] });

    expect(budgetsService.update).toHaveBeenCalledWith('2026-08', {
      items: [updatedItem],
    });
    expect(budgetsService.create).not.toHaveBeenCalled();
    expect(store.budget).toEqual(septemberBudget);
    expect(store.budgets).toEqual([septemberBudget]);
    expect(store.loading).toBe(false);
  });

  it('records and rethrows an Error when saving fails', async () => {
    const error = new Error('Could not save budget');
    vi.mocked(budgetsService.create).mockRejectedValue(error);
    const store = useBudgetsStore();

    await expect(store.save(payload)).rejects.toBe(error);

    expect(store.error).toBe('Could not save budget');
    expect(store.loading).toBe(false);
  });

  it('uses a generic message for a non-Error save failure', async () => {
    vi.mocked(budgetsService.create).mockRejectedValue('save failed');
    const store = useBudgetsStore();

    await expect(store.save(payload)).rejects.toBe('save failed');

    expect(store.error).toBe('Could not save the budget');
    expect(store.loading).toBe(false);
  });

  it('clears every piece of budget state and invalidates in-flight requests', async () => {
    let resolvePending: (value: Budget | null) => void = () => undefined;
    const pending = new Promise<Budget | null>((resolve) => {
      resolvePending = resolve;
    });
    vi.mocked(budgetsService.getByMonth).mockReturnValue(pending);
    const store = useBudgetsStore();
    store.month = '2026-08';
    store.budget = augustBudget;
    store.template = template;
    store.error = 'old error';

    const pendingFetch = store.fetchForMonth('2026-09');
    store.clear();
    resolvePending(septemberBudget);
    await pendingFetch;

    expect(store.month).toBeNull();
    expect(store.budget).toBeNull();
    expect(store.template).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('returns an empty template and keeps cleared state when a pending template is invalidated', async () => {
    let resolvePending: (value: BudgetItem[]) => void = () => undefined;
    const pending = new Promise<BudgetItem[]>((resolve) => {
      resolvePending = resolve;
    });
    vi.mocked(budgetsService.template).mockReturnValue(pending);
    const store = useBudgetsStore();
    store.month = '2026-08';
    store.budget = augustBudget;
    store.template = template;
    store.error = 'old error';

    const pendingFetch = store.fetchTemplate('2026-09');
    store.clear();
    resolvePending(template);

    await expect(pendingFetch).resolves.toEqual([]);

    expect(store.month).toBeNull();
    expect(store.budget).toBeNull();
    expect(store.template).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('keeps the newest month when requests finish out of order', async () => {
    let resolvePrevious: (value: Budget | null) => void = () => undefined;
    const previousResponse = new Promise<Budget | null>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(budgetsService.getByMonth)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce(septemberBudget);
    const store = useBudgetsStore();

    const previousFetch = store.fetchForMonth('2026-08');
    const currentFetch = store.fetchForMonth('2026-09');
    await currentFetch;
    resolvePrevious(augustBudget);
    await previousFetch;

    expect(store.month).toBe('2026-09');
    expect(store.budget).toEqual(septemberBudget);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('keeps the newest template when template requests finish out of order', async () => {
    let resolvePrevious: (value: BudgetItem[]) => void = () => undefined;
    const previousResponse = new Promise<BudgetItem[]>((resolve) => {
      resolvePrevious = resolve;
    });
    const currentTemplate: BudgetItem[] = [
      { categoryId: 'c2', type: 'income', amount: 3000 },
    ];
    vi.mocked(budgetsService.template)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce(currentTemplate);
    const store = useBudgetsStore();

    const previousFetch = store.fetchTemplate('2026-08');
    const currentFetch = store.fetchTemplate('2026-09');
    await expect(currentFetch).resolves.toEqual(currentTemplate);
    resolvePrevious(template);
    await expect(previousFetch).resolves.toEqual([]);

    expect(store.month).toBe('2026-09');
    expect(store.template).toEqual(currentTemplate);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });
});
