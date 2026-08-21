import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import { transactionsService } from './transactions';
import type { CreateTransactionPayload, UpdateTransactionPayload } from '../types/transaction';

describe('transactionsService.summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
  });

  it('requests the summary endpoint with the period as query parameters', async () => {
    await transactionsService.summary({
      from: new Date('2026-08-01T06:00:00.000Z'),
      to: new Date('2026-09-01T05:59:59.999Z'),
      granularity: 'day',
      timeZone: 'America/Mexico_City',
    });

    const path = vi.mocked(apiFetch).mock.calls[0][0];
    const query = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/transactions/summary?')).toBe(true);
    expect(query.get('from')).toBe('2026-08-01T06:00:00.000Z');
    expect(query.get('to')).toBe('2026-09-01T05:59:59.999Z');
    expect(query.get('granularity')).toBe('day');
    expect(query.get('timeZone')).toBe('America/Mexico_City');
  });

  it('goes through the shared api client instead of building its own request', async () => {
    await transactionsService.summary({
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-02T00:00:00.000Z'),
      granularity: 'hour',
      timeZone: 'UTC',
    });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    // Sin segundo argumento: ni headers ni token construidos a mano.
    expect(vi.mocked(apiFetch).mock.calls[0][1]).toBeUndefined();
  });
});

describe('transactionsService transfer payloads and filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(undefined as never);
  });

  it('includes the destination account when creating a transfer', async () => {
    const payload: CreateTransactionPayload = {
      title: 'Move money',
      amount: 125,
      type: 'transfer',
      accountId: 'a1',
      destinationAccountId: 'a2',
    };

    await transactionsService.create(payload);

    expect(apiFetch).toHaveBeenCalledWith('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('includes the destination account when updating a transfer', async () => {
    const payload: UpdateTransactionPayload = {
      type: 'transfer',
      accountId: 'a1',
      destinationAccountId: 'a2',
    };

    await transactionsService.update('t1', payload);

    expect(apiFetch).toHaveBeenCalledWith('/transactions/t1', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  });

  it('serializes the transfer type in the transaction list filter', async () => {
    await transactionsService.list({ page: 1, limit: 20, type: 'transfer' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/transactions?page=1&limit=20&type=transfer',
    );
  });
});
