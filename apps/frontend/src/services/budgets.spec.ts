import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import { budgetsService } from './budgets';
import type { Budget, BudgetItem, CreateBudgetPayload, UpdateBudgetPayload } from '../types/budget';

const item: BudgetItem = {
  categoryId: 'c1',
  type: 'expense',
  amount: 900,
  note: 'Rent',
};

const budget: Budget = {
  id: 'b1',
  month: '2026-08',
  items: [item],
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const createPayload: CreateBudgetPayload = {
  month: '2026-08',
  items: [item],
};

const updatePayload: UpdateBudgetPayload = {
  items: [{ ...item, amount: 950 }],
};

describe('budgetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
  });

  it('lists budgets without constructing authorization headers', async () => {
    await budgetsService.list();

    expect(apiFetch).toHaveBeenCalledWith('/budgets');
    expect(vi.mocked(apiFetch).mock.calls[0][1]).toBeUndefined();
  });

  it('serializes all optional list filters through the shared API client', async () => {
    await budgetsService.list({ from: '2026-08', to: '2026-12', limit: 12 });

    expect(apiFetch).toHaveBeenCalledWith(
      '/budgets?from=2026-08&to=2026-12&limit=12',
    );
    expect(vi.mocked(apiFetch).mock.calls[0][1]).toBeUndefined();
  });

  it('gets a budget by month through apiFetch', async () => {
    vi.mocked(apiFetch).mockResolvedValue(budget as never);

    await expect(budgetsService.getByMonth('2026-08')).resolves.toEqual(budget);

    expect(apiFetch).toHaveBeenCalledWith('/budgets/2026-08');
    expect(vi.mocked(apiFetch).mock.calls[0][1]).toBeUndefined();
  });

  it.each([
    { status: 404 },
    { statusCode: 404 },
  ])('returns null for a not-found error represented by %j', async (error) => {
    vi.mocked(apiFetch).mockRejectedValue(error);

    await expect(budgetsService.getByMonth('2026-08')).resolves.toBeNull();
  });

  it('propagates non-404 errors from getByMonth unchanged', async () => {
    const error = { status: 500, message: 'Server down' };
    vi.mocked(apiFetch).mockRejectedValue(error);

    await expect(budgetsService.getByMonth('2026-08')).rejects.toBe(error);
  });

  it('gets the schedule-derived template without manual authorization headers', async () => {
    vi.mocked(apiFetch).mockResolvedValue([item] as never);

    await expect(budgetsService.template('2026-08')).resolves.toEqual([item]);

    expect(apiFetch).toHaveBeenCalledWith('/budgets/2026-08/template');
    expect(vi.mocked(apiFetch).mock.calls[0][1]).toBeUndefined();
  });

  it('creates a budget with the API payload', async () => {
    vi.mocked(apiFetch).mockResolvedValue(budget as never);

    await budgetsService.create(createPayload);

    expect(apiFetch).toHaveBeenCalledWith('/budgets', {
      method: 'POST',
      body: JSON.stringify(createPayload),
    });
  });

  it('updates a budget by month with the API payload', async () => {
    vi.mocked(apiFetch).mockResolvedValue(budget as never);

    await budgetsService.update('2026-08', updatePayload);

    expect(apiFetch).toHaveBeenCalledWith('/budgets/2026-08', {
      method: 'PATCH',
      body: JSON.stringify(updatePayload),
    });
  });

  it('removes a budget by month', async () => {
    await budgetsService.remove('2026-08');

    expect(apiFetch).toHaveBeenCalledWith('/budgets/2026-08', {
      method: 'DELETE',
    });
  });
});
