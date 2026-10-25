import { TransactionView } from '../../../transactions/presentation/dto/transaction-response.dto';
import { DebtLink } from '../../../transactions/domain/debt-link';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';

export interface ScheduledTransactionView {
  id: string;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  type: TransactionType;
  title: string;
  amount: number;
  tags: string[];
  debtLink: DebtLink | null;
  scheduledFor: Date;
  recurring: boolean;
  status: ScheduledTransactionStatus;
  transactionId: string | null;
}

export interface ExecutedScheduledTransactionView {
  scheduled: ScheduledTransactionView;
  transaction: TransactionView;
  next: ScheduledTransactionView | null;
}
