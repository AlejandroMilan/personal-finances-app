import type {
  CreateTransactionPayload,
  PaginatedTransactions,
  TransactionFilters,
  TransactionView,
  UpdateTransactionPayload,
} from '../types/transaction';
import type {
  SummaryQueryParams,
  TransactionsSummaryView,
} from '../types/summary';
import { apiFetch } from './api';

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.type) params.set('type', filters.type);
  if (filters.title) params.set('title', filters.title);
  if (filters.tags && filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params.toString();
}

export const transactionsService = {
  list(filters: TransactionFilters): Promise<PaginatedTransactions> {
    return apiFetch<PaginatedTransactions>(`/transactions?${buildQuery(filters)}`);
  },

  summary(params: SummaryQueryParams): Promise<TransactionsSummaryView> {
    const query = new URLSearchParams({
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      granularity: params.granularity,
      timeZone: params.timeZone,
    });
    return apiFetch<TransactionsSummaryView>(`/transactions/summary?${query.toString()}`);
  },

  create(payload: CreateTransactionPayload): Promise<TransactionView> {
    return apiFetch<TransactionView>('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(id: string, payload: UpdateTransactionPayload): Promise<TransactionView> {
    return apiFetch<TransactionView>(`/transactions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/transactions/${id}`, { method: 'DELETE' });
  },
};
