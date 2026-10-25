import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({ apiFetch: vi.fn() }));

import { apiFetch } from './api';
import { debtsService } from './debts';

describe('debtsService', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockResolvedValue(undefined);
  });

  it('lists debts and posts a new one as JSON', async () => {
    await debtsService.list();
    expect(apiFetch).toHaveBeenLastCalledWith('/debts');

    await debtsService.create({ name: 'Card', totalAmount: 500, revolving: true });
    expect(apiFetch).toHaveBeenLastCalledWith('/debts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Card', totalAmount: 500, revolving: true }),
    });
  });

  it('patches and deletes a debt by id', async () => {
    await debtsService.update('d1', { name: 'Other' });
    expect(apiFetch).toHaveBeenLastCalledWith('/debts/d1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Other' }),
    });

    await debtsService.remove('d1');
    expect(apiFetch).toHaveBeenLastCalledWith('/debts/d1', { method: 'DELETE' });
  });

  it('requests the general log or the log of one debt', async () => {
    await debtsService.movements();
    expect(apiFetch).toHaveBeenLastCalledWith('/debts/movements');

    await debtsService.movements('d 1');
    expect(apiFetch).toHaveBeenLastCalledWith('/debts/movements?debtId=d%201');
  });
});
