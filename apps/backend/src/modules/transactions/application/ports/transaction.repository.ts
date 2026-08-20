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

export type SummaryGranularity = 'hour' | 'day' | 'month';

export interface SummaryQuery {
  from: Date;
  to: Date;
  granularity: SummaryGranularity;
  /** Zona IANA con la que se alinean los buckets de la serie. */
  timeZone: string;
}

export interface CategoryTotal {
  /** `null` agrupa las transacciones sin categoría. */
  categoryId: string | null;
  total: number;
}

export interface SummaryBucket {
  /** Instante de inicio del intervalo. */
  bucket: Date;
  income: number;
  expense: number;
}

export interface TransactionsSummary {
  totals: { income: number; expense: number };
  byCategory: { income: CategoryTotal[]; expense: CategoryTotal[] };
  series: SummaryBucket[];
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
  summarize(userId: string, query: SummaryQuery): Promise<TransactionsSummary>;
}

export const TRANSACTION_REPOSITORY = 'TRANSACTION_REPOSITORY';
