import type { TransactionType, TransactionView } from './transaction';

export type ScheduledTransactionStatus = 'pending' | 'executed' | 'cancelled';

export interface ScheduledTransactionView {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  tags: string[];
  scheduledFor: string;
  recurring: boolean;
  status: ScheduledTransactionStatus;
  transactionId: string | null;
}

export interface CreateScheduledTransactionPayload {
  title: string;
  amount: number;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  scheduledFor: string;
  recurring?: boolean;
  tags?: string[];
}

export interface UpdateScheduledTransactionPayload {
  title?: string;
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string | null;
  scheduledFor?: string;
  recurring?: boolean;
  tags?: string[];
}

export interface ExecuteScheduledTransactionPayload {
  amount?: number;
  timestamp?: string;
  accountId?: string;
  categoryId?: string | null;
  /** Pide reagendar; sin `rescheduleFor` el backend usa un mes después. */
  reschedule?: boolean;
  /** Fecha exacta de la siguiente ocurrencia. */
  rescheduleFor?: string;
}

export interface ExecutedScheduledTransactionView {
  scheduled: ScheduledTransactionView;
  transaction: TransactionView;
  next: ScheduledTransactionView | null;
}

export interface ScheduledTransactionFilters {
  status?: ScheduledTransactionStatus;
  from?: string;
  to?: string;
}
