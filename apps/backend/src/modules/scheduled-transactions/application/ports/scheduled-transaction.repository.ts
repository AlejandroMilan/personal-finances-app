import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';

export interface ScheduledTransactionFilters {
  status?: ScheduledTransactionStatus;
  /** Límite inferior de la fecha prevista, inclusivo. */
  from?: Date;
  /** Límite superior de la fecha prevista, inclusivo. */
  to?: Date;
}

export interface ScheduledTransactionRepository {
  findById(id: string): Promise<ScheduledTransaction | null>;
  findByUserId(
    userId: string,
    filters: ScheduledTransactionFilters,
  ): Promise<ScheduledTransaction[]>;
  save(scheduled: ScheduledTransaction): Promise<ScheduledTransaction>;
  deleteById(id: string): Promise<void>;
}

export const SCHEDULED_TRANSACTION_REPOSITORY =
  'SCHEDULED_TRANSACTION_REPOSITORY';
