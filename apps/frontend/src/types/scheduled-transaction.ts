import type { DebtLink, DebtLinkPayload } from './debt';
import type { TransactionType, TransactionView } from './transaction';

export type ScheduledTransactionStatus = 'pending' | 'executed' | 'cancelled';

export interface ScheduledTransactionView {
  id: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  tags: string[];
  debtLink?: DebtLink | null;
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
  destinationAccountId?: string;
  categoryId?: string;
  scheduledFor: string;
  recurring?: boolean;
  tags?: string[];
  debtLink?: DebtLinkPayload | null;
}

export interface UpdateScheduledTransactionPayload {
  title?: string;
  amount?: number;
  type?: TransactionType;
  accountId?: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  scheduledFor?: string;
  recurring?: boolean;
  tags?: string[];
  debtLink?: DebtLinkPayload | null;
}

export interface ExecuteScheduledTransactionPayload {
  amount?: number;
  timestamp?: string;
  accountId?: string;
  destinationAccountId?: string;
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
