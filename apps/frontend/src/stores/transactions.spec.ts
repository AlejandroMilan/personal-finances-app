import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/transactions', () => ({
  transactionsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../services/accounts', () => ({
  accountsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { accountsService } from '../services/accounts';
import { transactionsService } from '../services/transactions';
import type { PaginatedTransactions, TransactionView } from '../types/transaction';
import { useTransactionsStore } from './transactions';

const transaction: TransactionView = {
  id: 't1',
  accountId: 'a1',
  categoryId: 'c1',
  type: 'expense',
  title: 'Lunch',
  amount: 50,
  timestamp: '2026-08-01T12:00:00.000Z',
  tags: ['food'],
};

const page: PaginatedTransactions = {
  items: [transaction],
  total: 1,
  page: 1,
  limit: 20,
};

describe('transactions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches the transactions using the current filters', async () => {
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    const store = useTransactionsStore();

    await store.fetchTransactions();

    expect(transactionsService.list).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(store.items).toHaveLength(1);
    expect(store.total).toBe(1);
    expect(store.loading).toBe(false);
  });

  it('changes the page and refetches', async () => {
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    const store = useTransactionsStore();

    await store.setPage(2);

    expect(transactionsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2 }),
    );
  });

  it('applies filters resetting the page to 1', async () => {
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    const store = useTransactionsStore();
    store.filters = { page: 3, limit: 20 };

    await store.applyFilters({ type: 'income' });

    expect(transactionsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, type: 'income' }),
    );
  });

  it('creates a transaction refreshing the list and the account balances', async () => {
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    vi.mocked(accountsService.list).mockResolvedValue([]);
    const store = useTransactionsStore();

    await store.createTransaction({
      title: 'Lunch',
      amount: 50,
      type: 'expense',
      accountId: 'a1',
    });

    expect(transactionsService.create).toHaveBeenCalledWith({
      title: 'Lunch',
      amount: 50,
      type: 'expense',
      accountId: 'a1',
    });
    expect(transactionsService.list).toHaveBeenCalled();
    expect(accountsService.list).toHaveBeenCalled();
  });

  it('updates a transaction refreshing the list and the account balances', async () => {
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    vi.mocked(accountsService.list).mockResolvedValue([]);
    const store = useTransactionsStore();

    await store.updateTransaction('t1', { amount: 80 });

    expect(transactionsService.update).toHaveBeenCalledWith('t1', { amount: 80 });
    expect(accountsService.list).toHaveBeenCalled();
  });

  it('deletes a transaction refreshing the list and the account balances', async () => {
    vi.mocked(transactionsService.list).mockResolvedValue(page);
    vi.mocked(accountsService.list).mockResolvedValue([]);
    const store = useTransactionsStore();

    await store.deleteTransaction('t1');

    expect(transactionsService.remove).toHaveBeenCalledWith('t1');
    expect(accountsService.list).toHaveBeenCalled();
  });
});
