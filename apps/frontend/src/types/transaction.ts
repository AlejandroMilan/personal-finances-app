export type TransactionType = 'income' | 'expense';

export interface TransactionView {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  timestamp: string;
  tags: string[];
}

export interface CreateTransactionPayload {
  title: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  timestamp?: string;
  tags?: string[];
}

export interface UpdateTransactionPayload {
  title?: string;
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string | null;
  timestamp?: string;
  tags?: string[];
}

export interface TransactionFilters {
  page: number;
  limit: number;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  title?: string;
  tags?: string[];
  from?: string;
  to?: string;
}

export interface PaginatedTransactions {
  items: TransactionView[];
  total: number;
  page: number;
  limit: number;
}
