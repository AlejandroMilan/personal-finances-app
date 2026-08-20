import type {
  CreateScheduledTransactionPayload,
  ExecuteScheduledTransactionPayload,
  ExecutedScheduledTransactionView,
  ScheduledTransactionFilters,
  ScheduledTransactionView,
  UpdateScheduledTransactionPayload,
} from '../types/scheduled-transaction';
import { apiFetch } from './api';

function buildQuery(filters: ScheduledTransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const scheduledTransactionsService = {
  list(filters: ScheduledTransactionFilters = {}): Promise<ScheduledTransactionView[]> {
    return apiFetch<ScheduledTransactionView[]>(
      `/scheduled-transactions${buildQuery(filters)}`,
    );
  },

  create(
    payload: CreateScheduledTransactionPayload,
  ): Promise<ScheduledTransactionView> {
    return apiFetch<ScheduledTransactionView>('/scheduled-transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(
    id: string,
    payload: UpdateScheduledTransactionPayload,
  ): Promise<ScheduledTransactionView> {
    return apiFetch<ScheduledTransactionView>(`/scheduled-transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/scheduled-transactions/${id}`, { method: 'DELETE' });
  },

  execute(
    id: string,
    payload: ExecuteScheduledTransactionPayload = {},
  ): Promise<ExecutedScheduledTransactionView> {
    return apiFetch<ExecutedScheduledTransactionView>(
      `/scheduled-transactions/${id}/execute`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },

  cancel(id: string): Promise<ScheduledTransactionView> {
    return apiFetch<ScheduledTransactionView>(
      `/scheduled-transactions/${id}/cancel`,
      { method: 'POST' },
    );
  },
};
