import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  title?: string;
  tags?: string[];
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByUserId(
    userId: string,
    filters: TransactionFilters,
  ): Promise<PaginatedTransactions>;
  save(transaction: Transaction): Promise<Transaction>;
  delete(id: string): Promise<void>;
  deleteByAccountId(accountId: string): Promise<void>;
  clearCategoryReferences(categoryId: string): Promise<void>;
}

export const TRANSACTION_REPOSITORY = 'TRANSACTION_REPOSITORY';
