import { describe, expect, it } from 'vitest';
import type { AccountView } from '../types/account';
import {
  getAccountName,
  getDestinationAccountOptions,
  getTransactionAmountLabel,
  getTransactionTypeColor,
  getTransactionTypeLabel,
  getTransferLabel,
  transactionTypeOptions,
} from './transaction';

const accounts: AccountView[] = [
  {
    id: 'a1',
    name: 'Checking',
    balance: 1000,
    color: '#2E6B4F',
    type: 'cash',
    creditCard: null,
  },
  {
    id: 'a2',
    name: 'Savings',
    balance: 2000,
    color: '#7FA56E',
    type: 'cash',
    creditCard: null,
  },
];

describe('transaction type options', () => {
  it('includes transfer alongside income and expense', () => {
    expect(transactionTypeOptions).toEqual([
      { value: 'expense', label: 'Expense' },
      { value: 'income', label: 'Income' },
      { value: 'transfer', label: 'Transfer' },
    ]);
  });

  it('provides the label and theme color for every transaction type', () => {
    expect(getTransactionTypeLabel('expense')).toBe('Expense');
    expect(getTransactionTypeLabel('income')).toBe('Income');
    expect(getTransactionTypeLabel('transfer')).toBe('Transfer');
    expect(getTransactionTypeColor('expense')).toBe('error');
    expect(getTransactionTypeColor('income')).toBe('success');
    expect(getTransactionTypeColor('transfer')).toBe('primary');
  });
});

describe('destination account options', () => {
  it('excludes the selected source account', () => {
    expect(getDestinationAccountOptions(accounts, 'a1')).toEqual([accounts[1]]);
  });

  it('keeps every account when no source is selected', () => {
    expect(getDestinationAccountOptions(accounts, '')).toEqual(accounts);
  });
});

describe('account and transfer labels', () => {
  it('resolves account names and uses a fallback for an unknown account', () => {
    expect(getAccountName(accounts, 'a1')).toBe('Checking');
    expect(getAccountName(accounts, 'missing')).toBe('Unknown account');
  });

  it('formats a transfer with both account names', () => {
    expect(
      getTransferLabel(
        { accountId: 'a1', destinationAccountId: 'a2' },
        accounts,
      ),
    ).toBe('Checking → Savings');
  });

  it('shows an explicit fallback when a transfer has no destination', () => {
    expect(
      getTransferLabel(
        { accountId: 'a1', destinationAccountId: null },
        accounts,
      ),
    ).toBe('Checking → Unknown account');
  });
});

describe('transaction amount labels', () => {
  it('keeps income and expense signs and leaves transfers neutral', () => {
    expect(getTransactionAmountLabel({ type: 'income', amount: 25 })).toContain('+$');
    expect(getTransactionAmountLabel({ type: 'expense', amount: 25 })).toContain('-$');
    expect(getTransactionAmountLabel({ type: 'transfer', amount: 25 })).toContain('$');
    expect(getTransactionAmountLabel({ type: 'transfer', amount: 25 })).not.toContain('+$');
    expect(getTransactionAmountLabel({ type: 'transfer', amount: 25 })).not.toContain('-$');
  });
});
