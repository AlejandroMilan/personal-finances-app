import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import { scheduledTransactionsService } from './scheduled-transactions';

const callPath = (index = 0) => vi.mocked(apiFetch).mock.calls[index][0];
const callOptions = (index = 0) => vi.mocked(apiFetch).mock.calls[index][1];

describe('scheduledTransactionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
  });

  it('lists without query parameters when there are no filters', async () => {
    await scheduledTransactionsService.list();

    expect(callPath()).toBe('/scheduled-transactions');
  });

  it('lists applying status and date range', async () => {
    await scheduledTransactionsService.list({
      status: 'pending',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-31T23:59:59.999Z',
    });

    const query = new URLSearchParams(callPath().split('?')[1]);
    expect(query.get('status')).toBe('pending');
    expect(query.get('from')).toBe('2026-08-01T00:00:00.000Z');
    expect(query.get('to')).toBe('2026-08-31T23:59:59.999Z');
  });

  it('creates a scheduled transaction with a POST', async () => {
    await scheduledTransactionsService.create({
      title: 'Rent',
      amount: 12000,
      type: 'expense',
      accountId: 'a1',
      scheduledFor: '2026-09-01T00:00:00.000Z',
      recurring: true,
    });

    expect(callPath()).toBe('/scheduled-transactions');
    expect(callOptions()?.method).toBe('POST');
    expect(JSON.parse(String(callOptions()?.body))).toMatchObject({
      title: 'Rent',
      recurring: true,
    });
  });

  it('updates a scheduled transaction with a PATCH', async () => {
    await scheduledTransactionsService.update('s1', { amount: 13000 });

    expect(callPath()).toBe('/scheduled-transactions/s1');
    expect(callOptions()?.method).toBe('PATCH');
    expect(JSON.parse(String(callOptions()?.body))).toEqual({ amount: 13000 });
  });

  it('removes a scheduled transaction with a DELETE', async () => {
    await scheduledTransactionsService.remove('s1');

    expect(callPath()).toBe('/scheduled-transactions/s1');
    expect(callOptions()?.method).toBe('DELETE');
  });

  it('executes a scheduled transaction with the confirmed adjustments', async () => {
    await scheduledTransactionsService.execute('s1', {
      amount: 12500,
      timestamp: '2026-08-20T00:00:00.000Z',
      rescheduleFor: '2026-10-01T00:00:00.000Z',
    });

    expect(callPath()).toBe('/scheduled-transactions/s1/execute');
    expect(callOptions()?.method).toBe('POST');
    expect(JSON.parse(String(callOptions()?.body))).toEqual({
      amount: 12500,
      timestamp: '2026-08-20T00:00:00.000Z',
      rescheduleFor: '2026-10-01T00:00:00.000Z',
    });
  });

  it('executes without a payload when nothing is adjusted', async () => {
    await scheduledTransactionsService.execute('s1');

    expect(JSON.parse(String(callOptions()?.body))).toEqual({});
  });

  it('cancels a scheduled transaction with a POST', async () => {
    await scheduledTransactionsService.cancel('s1');

    expect(callPath()).toBe('/scheduled-transactions/s1/cancel');
    expect(callOptions()?.method).toBe('POST');
  });

  it('never builds authorization headers on its own', async () => {
    await scheduledTransactionsService.list({ status: 'executed' });
    await scheduledTransactionsService.cancel('s1');

    expect(callOptions(0)?.headers).toBeUndefined();
    expect(callOptions(1)?.headers).toBeUndefined();
  });
});
