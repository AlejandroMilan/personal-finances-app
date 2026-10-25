import type {
  CreateDebtPayload,
  Debt,
  DebtMovement,
  UpdateDebtPayload,
} from '../types/debt';
import { apiFetch } from './api';

export const debtsService = {
  list(): Promise<Debt[]> {
    return apiFetch<Debt[]>('/debts');
  },

  create(payload: CreateDebtPayload): Promise<Debt> {
    return apiFetch<Debt>('/debts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateDebtPayload): Promise<Debt> {
    return apiFetch<Debt>(`/debts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/debts/${id}`, { method: 'DELETE' });
  },

  /** Log general o, con `debtId`, el de una sola deuda. */
  movements(debtId?: string): Promise<DebtMovement[]> {
    const query = debtId ? `?debtId=${encodeURIComponent(debtId)}` : '';
    return apiFetch<DebtMovement[]>(`/debts/movements${query}`);
  },
};
