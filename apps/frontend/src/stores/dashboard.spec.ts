import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('../services/transactions', () => ({
  transactionsService: {
    summary: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import { transactionsService } from '../services/transactions';
import type { TransactionsSummaryView } from '../types/summary';
import { useDashboardStore } from './dashboard';

const summary: TransactionsSummaryView = {
  from: '2026-08-01T06:00:00.000Z',
  to: '2026-09-01T05:59:59.999Z',
  granularity: 'day',
  timeZone: 'America/Mexico_City',
  totals: { income: 900, expense: 250.5 },
  byCategory: {
    income: [{ categoryId: 'c3', total: 900 }],
    expense: [{ categoryId: 'c1', total: 250.5 }],
  },
  series: [
    { bucket: '2026-08-01T06:00:00.000Z', income: 900, expense: 250.5 },
  ],
};

describe('dashboard store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(transactionsService.summary).mockResolvedValue(summary);
  });

  it('starts on the current month', () => {
    const store = useDashboardStore();

    expect(store.period.kind).toBe('month');
    expect(store.period.from.getMonth()).toBe(new Date().getMonth());
    expect(store.period.granularity).toBe('day');
    expect(store.summary).toBeNull();
  });

  it('fetches the summary of the selected period with the browser time zone', async () => {
    const store = useDashboardStore();

    await store.fetchSummary();

    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
    const params = vi.mocked(transactionsService.summary).mock.calls[0][0];
    expect(params.from).toEqual(store.period.from);
    expect(params.to).toEqual(store.period.to);
    expect(params.granularity).toBe('day');
    expect(params.timeZone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(store.summary).toEqual(summary);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('keeps the newest summary when requests finish out of order', async () => {
    let resolvePrevious: (value: TransactionsSummaryView) => void = () => undefined;
    const previousResponse = new Promise<TransactionsSummaryView>((resolve) => {
      resolvePrevious = resolve;
    });
    const currentSummary = {
      ...summary,
      totals: { income: 0, expense: 800 },
    };
    vi.mocked(transactionsService.summary)
      .mockReturnValueOnce(previousResponse)
      .mockResolvedValueOnce(currentSummary);
    const store = useDashboardStore();

    const previousFetch = store.fetchSummary();
    const currentFetch = store.selectPreset('year');
    await currentFetch;
    resolvePrevious(summary);
    await previousFetch;

    expect(store.summary).toEqual(currentSummary);
    expect(store.period.kind).toBe('year');
  });

  it('changing the preset triggers exactly one request and updates the period', async () => {
    const store = useDashboardStore();

    await store.selectPreset('year');

    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
    expect(store.period.kind).toBe('year');
    expect(store.period.granularity).toBe('month');
    expect(store.summary).toEqual(summary);
  });

  it('selecting a custom range expands it to whole days and requests once', async () => {
    const store = useDashboardStore();

    await store.selectCustomRange(
      new Date(2026, 0, 5, 18, 0, 0),
      new Date(2026, 0, 6, 9, 0, 0),
    );

    expect(transactionsService.summary).toHaveBeenCalledTimes(1);
    expect(store.period.kind).toBe('custom');
    expect(store.period.from.getHours()).toBe(0);
    expect(store.period.to.getHours()).toBe(23);
    expect(store.period.granularity).toBe('hour');
  });

  it('propagates an invalid custom range without calling the API', () => {
    const store = useDashboardStore();

    expect(() =>
      store.selectCustomRange(new Date(2026, 0, 10), new Date(2026, 0, 1)),
    ).toThrow(RangeError);
    expect(transactionsService.summary).not.toHaveBeenCalled();
  });

  it('exposes the error and clears the stale summary when the request fails', async () => {
    const store = useDashboardStore();
    await store.fetchSummary();
    expect(store.summary).not.toBeNull();

    vi.mocked(transactionsService.summary).mockRejectedValue(
      new Error('Network down'),
    );
    await store.selectPreset('day');

    expect(store.error).toBe('Network down');
    expect(store.summary).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    const store = useDashboardStore();
    vi.mocked(transactionsService.summary).mockRejectedValue('boom');

    await store.fetchSummary();

    expect(store.error).toBe('No se pudo cargar el resumen');
  });

  it('clears a previous error on a successful refetch', async () => {
    const store = useDashboardStore();
    vi.mocked(transactionsService.summary).mockRejectedValueOnce(
      new Error('Network down'),
    );
    await store.fetchSummary();
    expect(store.error).toBe('Network down');

    await store.fetchSummary();

    expect(store.error).toBeNull();
    expect(store.summary).toEqual(summary);
  });

  it('reports whether the period has any movement', async () => {
    const store = useDashboardStore();
    await store.fetchSummary();
    expect(store.hasData).toBe(true);

    vi.mocked(transactionsService.summary).mockResolvedValue({
      ...summary,
      totals: { income: 0, expense: 0 },
    });
    await store.fetchSummary();

    expect(store.hasData).toBe(false);
  });
});
