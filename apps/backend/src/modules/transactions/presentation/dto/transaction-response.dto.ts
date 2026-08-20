import { TransactionType } from '../../domain/transaction-type.enum';

export interface TransactionView {
  id: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  timestamp: Date;
  tags: string[];
}

export interface PaginatedTransactionsView {
  items: TransactionView[];
  total: number;
  page: number;
  limit: number;
}
