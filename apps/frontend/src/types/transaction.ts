import type { DebtLink, DebtLinkPayload } from './debt';
export type TransactionType = 'income' | 'expense' | 'transfer';

export interface TransactionView {
  id: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  timestamp: string;
  tags: string[];
  debtLink?: DebtLink | null;
}

export interface CreateTransactionPayload {
  title: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  timestamp?: string;
  tags?: string[];
  debtLink?: DebtLinkPayload | null;
}

export interface UpdateTransactionPayload {
  title?: string;
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  timestamp?: string;
  tags?: string[];
  debtLink?: DebtLinkPayload | null;
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
