import type { AccountView } from '../types/account';
import type { TransactionType, TransactionView } from '../types/transaction';
import { formatCurrency } from './money';

export interface TransactionTypeOption {
  value: TransactionType;
  label: string;
}

export const transactionTypeOptions: TransactionTypeOption[] = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
  { value: 'transfer', label: 'Transfer' },
];

const transactionTypeLabels: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
};

const transactionTypeColors: Record<TransactionType, string> = {
  expense: 'error',
  income: 'success',
  transfer: 'primary',
};

export function getDestinationAccountOptions(
  accounts: readonly AccountView[],
  sourceAccountId: string,
): AccountView[] {
  return accounts.filter((account) => account.id !== sourceAccountId);
}

export function getAccountName(
  accounts: readonly AccountView[],
  accountId: string,
): string {
  return accounts.find((account) => account.id === accountId)?.name ?? 'Unknown account';
}

export function getTransferLabel(
  transaction: Pick<TransactionView, 'accountId' | 'destinationAccountId'>,
  accounts: readonly AccountView[],
): string {
  const source = getAccountName(accounts, transaction.accountId);
  const destination = transaction.destinationAccountId
    ? getAccountName(accounts, transaction.destinationAccountId)
    : 'Unknown account';

  return `${source} → ${destination}`;
}

export function getTransactionTypeLabel(type: TransactionType): string {
  return transactionTypeLabels[type];
}

export function getTransactionTypeColor(type: TransactionType): string {
  return transactionTypeColors[type];
}

export function getTransactionAmountLabel(
  transaction: Pick<TransactionView, 'type' | 'amount'>,
): string {
  const sign = transaction.type === 'income'
    ? '+'
    : transaction.type === 'expense'
      ? '-'
      : '';

  return `${sign}${formatCurrency(transaction.amount)}`;
}
