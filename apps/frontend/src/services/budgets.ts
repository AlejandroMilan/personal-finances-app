import type {
  Budget,
  BudgetFilters,
  BudgetItem,
  CreateBudgetPayload,
  UpdateBudgetPayload,
} from '../types/budget';
import { apiFetch } from './api';

function buildQuery(filters: BudgetFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

interface ErrorWithStatus {
  status?: unknown;
  statusCode?: unknown;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const errorWithStatus = error as ErrorWithStatus;
  return errorWithStatus.status === 404 || errorWithStatus.statusCode === 404;
}

export const budgetsService = {
  list(filters: BudgetFilters = {}): Promise<Budget[]> {
    return apiFetch<Budget[]>(`/budgets${buildQuery(filters)}`);
  },

  async getByMonth(month: string): Promise<Budget | null> {
    try {
      return await apiFetch<Budget>(`/budgets/${month}`);
    } catch (caught) {
      if (isNotFoundError(caught)) return null;
      throw caught;
    }
  },

  template(month: string): Promise<BudgetItem[]> {
    return apiFetch<BudgetItem[]>(`/budgets/${month}/template`);
  },

  create(payload: CreateBudgetPayload): Promise<Budget> {
    return apiFetch<Budget>('/budgets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update(month: string, payload: UpdateBudgetPayload): Promise<Budget> {
    return apiFetch<Budget>(`/budgets/${month}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  remove(month: string): Promise<void> {
    return apiFetch<void>(`/budgets/${month}`, { method: 'DELETE' });
  },
};
