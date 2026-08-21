import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/scheduled-transactions', () => ({
  scheduledTransactionsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('../services/accounts', () => ({
  accountsService: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { accountsService } from '../services/accounts';
import { scheduledTransactionsService } from '../services/scheduled-transactions';
import type { ScheduledTransactionView } from '../types/scheduled-transaction';
import { useScheduledTransactionsStore } from './scheduled-transactions';

const scheduled = (
  overrides: Partial<ScheduledTransactionView> = {},
): ScheduledTransactionView => ({
  id: 's1',
  accountId: 'a1',
  destinationAccountId: null,
  categoryId: 'c1',
  type: 'expense',
  title: 'Rent',
  amount: 12000,
  tags: [],
  scheduledFor: '2026-09-01T00:00:00.000Z',
  recurring: true,
  status: 'pending',
  transactionId: null,
  ...overrides,
});

describe('scheduled transactions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([scheduled()]);
    vi.mocked(accountsService.list).mockResolvedValue([]);
  });

  it('fetches the pending scheduled transactions by default', async () => {
    const store = useScheduledTransactionsStore();

    await store.fetchScheduled();

    expect(scheduledTransactionsService.list).toHaveBeenCalledWith({
      status: 'pending',
    });
    expect(store.items).toHaveLength(1);
    expect(store.pending).toHaveLength(1);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('ignores a delayed response from an invalidated session', async () => {
    let resolvePrevious: (value: ScheduledTransactionView[]) => void = () => undefined;
    const previousResponse = new Promise<ScheduledTransactionView[]>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(scheduledTransactionsService.list)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce([scheduled({ id: 'current', title: 'Current' })]);
    const store = useScheduledTransactionsStore();

    const previousFetch = store.fetchScheduled();
    store.clear();
    const currentFetch = store.fetchScheduled();
    resolvePrevious([scheduled({ id: 'previous', title: 'Previous' })]);

    await Promise.all([previousFetch, currentFetch]);

    expect(store.items.map((item) => item.title)).toEqual(['Current']);
  });

  it('keeps the newest response when same-session requests finish out of order', async () => {
    let resolvePrevious: (value: ScheduledTransactionView[]) => void = () => undefined;
    const previousResponse = new Promise<ScheduledTransactionView[]>((resolve) => {
      resolvePrevious = resolve;
    });
    vi.mocked(scheduledTransactionsService.list)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce([scheduled({ id: 'current', title: 'Current' })]);
    const store = useScheduledTransactionsStore();

    const previousFetch = store.fetchScheduled();
    const currentFetch = store.fetchScheduled();
    await currentFetch;
    resolvePrevious([scheduled({ id: 'previous', title: 'Previous' })]);
    await previousFetch;

    expect(store.items.map((item) => item.title)).toEqual(['Current']);
  });

  it('exposes the items sorted by scheduled date', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'b', scheduledFor: '2026-10-01T00:00:00.000Z' }),
      scheduled({ id: 'a', scheduledFor: '2026-09-01T00:00:00.000Z' }),
    ]);
    const store = useScheduledTransactionsStore();

    await store.fetchScheduled();

    expect(store.sorted.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('exposes the overdue and current month buckets', async () => {
    vi.mocked(scheduledTransactionsService.list).mockResolvedValue([
      scheduled({ id: 'old', scheduledFor: '2000-01-01T00:00:00.000Z' }),
    ]);
    const store = useScheduledTransactionsStore();

    await store.fetchScheduled();

    expect(store.buckets.overdue.map((item) => item.id)).toEqual(['old']);
  });

  it('changes the status filter and refetches', async () => {
    const store = useScheduledTransactionsStore();

    await store.selectStatus('cancelled');

    expect(store.status).toBe('cancelled');
    expect(scheduledTransactionsService.list).toHaveBeenCalledWith({
      status: 'cancelled',
    });
  });

  it('keeps the error message and empties the list when the request fails', async () => {
    vi.mocked(scheduledTransactionsService.list).mockRejectedValue(
      new Error('boom'),
    );
    const store = useScheduledTransactionsStore();

    await store.fetchScheduled();

    expect(store.error).toBe('boom');
    expect(store.items).toEqual([]);
    expect(store.loading).toBe(false);
  });

  it('falls back to a generic message on a non Error rejection', async () => {
    vi.mocked(scheduledTransactionsService.list).mockRejectedValue('nope');
    const store = useScheduledTransactionsStore();

    await store.fetchScheduled();

    expect(store.error).toBe('No se pudo cargar la agenda');
  });

  it('creates and refreshes the list', async () => {
    const store = useScheduledTransactionsStore();

    await store.createScheduled({
      title: 'Rent',
      amount: 12000,
      type: 'expense',
      accountId: 'a1',
      scheduledFor: '2026-09-01T00:00:00.000Z',
    });

    expect(scheduledTransactionsService.create).toHaveBeenCalled();
    expect(scheduledTransactionsService.list).toHaveBeenCalled();
  });

  it('updates and refreshes the list', async () => {
    const store = useScheduledTransactionsStore();

    await store.updateScheduled('s1', { amount: 13000 });

    expect(scheduledTransactionsService.update).toHaveBeenCalledWith('s1', {
      amount: 13000,
    });
    expect(scheduledTransactionsService.list).toHaveBeenCalled();
  });

  it('deletes and refreshes the list', async () => {
    const store = useScheduledTransactionsStore();

    await store.deleteScheduled('s1');

    expect(scheduledTransactionsService.remove).toHaveBeenCalledWith('s1');
    expect(scheduledTransactionsService.list).toHaveBeenCalled();
  });

  it('executes, refreshes the list and the account balances', async () => {
    const store = useScheduledTransactionsStore();

    await store.executeScheduled('s1', { amount: 12500 });

    expect(scheduledTransactionsService.execute).toHaveBeenCalledWith('s1', {
      amount: 12500,
    });
    expect(scheduledTransactionsService.list).toHaveBeenCalled();
    expect(accountsService.list).toHaveBeenCalled();
  });

  it('cancels and refreshes the list without touching the balances', async () => {
    const store = useScheduledTransactionsStore();

    await store.cancelScheduled('s1');

    expect(scheduledTransactionsService.cancel).toHaveBeenCalledWith('s1');
    expect(scheduledTransactionsService.list).toHaveBeenCalled();
    expect(accountsService.list).not.toHaveBeenCalled();
  });
});
