import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/debts', () => ({
  debtsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    movements: vi.fn(),
  },
}));

import { debtsService } from '../services/debts';
import type { Debt, DebtMovement } from '../types/debt';
import { useDebtsStore } from './debts';

const card: Debt = {
  id: 'd1',
  name: 'Card',
  totalAmount: 900,
  revolving: true,
  annualInterestRate: 30,
  paymentMode: 'capital',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const payment: DebtMovement = {
  id: 'm1',
  debtId: 'd1',
  kind: 'pago',
  delta: -100,
  amount: 120,
  capitalAmount: 100,
  interestAmount: 20,
  transactionId: 't1',
  occurredAt: '2026-02-01T00:00:00.000Z',
  balanceBefore: 1000,
  balanceAfter: 900,
};

describe('debts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(debtsService.list).mockReset();
    vi.mocked(debtsService.create).mockReset();
    vi.mocked(debtsService.update).mockReset();
    vi.mocked(debtsService.remove).mockReset();
    vi.mocked(debtsService.movements).mockReset();
  });

  it('loads debts and the general log in parallel', async () => {
    vi.mocked(debtsService.list).mockResolvedValue([card]);
    vi.mocked(debtsService.movements).mockResolvedValue([payment]);
    const store = useDebtsStore();

    await store.fetchAll();

    expect(store.debts).toEqual([card]);
    expect(store.movements).toEqual([payment]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('keeps an error message and empty lists when loading fails', async () => {
    vi.mocked(debtsService.list).mockRejectedValue(new Error('offline'));
    vi.mocked(debtsService.movements).mockResolvedValue([payment]);
    const store = useDebtsStore();

    await store.fetchAll();

    expect(store.debts).toEqual([]);
    expect(store.movements).toEqual([]);
    expect(store.error).toBe('offline');
  });

  it('reloads everything after a mutation so the balances stay in sync', async () => {
    vi.mocked(debtsService.create).mockResolvedValue(card);
    vi.mocked(debtsService.list).mockResolvedValue([card]);
    vi.mocked(debtsService.movements).mockResolvedValue([payment]);
    const store = useDebtsStore();

    const created = await store.create({ name: 'Card', totalAmount: 900, revolving: true });

    expect(created).toEqual(card);
    expect(debtsService.list).toHaveBeenCalledTimes(1);
    expect(store.movements).toEqual([payment]);
  });

  it('updates and removes debts through the service', async () => {
    vi.mocked(debtsService.update).mockResolvedValue(card);
    vi.mocked(debtsService.remove).mockResolvedValue(undefined);
    vi.mocked(debtsService.list).mockResolvedValue([]);
    vi.mocked(debtsService.movements).mockResolvedValue([]);
    const store = useDebtsStore();

    await store.update('d1', { name: 'Card' });
    await store.remove('d1');

    expect(debtsService.update).toHaveBeenCalledWith('d1', { name: 'Card' });
    expect(debtsService.remove).toHaveBeenCalledWith('d1');
  });

  it('filters the stored log by debt and clears its state', async () => {
    vi.mocked(debtsService.list).mockResolvedValue([card]);
    vi.mocked(debtsService.movements).mockResolvedValue([payment]);
    const store = useDebtsStore();
    await store.fetchAll();

    expect(store.movementsOf('d1')).toEqual([payment]);
    expect(store.movementsOf('other')).toEqual([]);

    store.clear();
    expect(store.debts).toEqual([]);
    expect(store.movements).toEqual([]);
  });
});
