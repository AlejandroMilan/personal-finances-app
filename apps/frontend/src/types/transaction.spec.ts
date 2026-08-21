import { describe, expect, it } from 'vitest';
import type {
  CreateTransactionPayload,
  TransactionView,
  UpdateTransactionPayload,
} from './transaction';

const transferView: TransactionView = {
  id: 't1',
  accountId: 'a1',
  destinationAccountId: 'a2',
  categoryId: null,
  type: 'transfer',
  title: 'Move money',
  amount: 125,
  timestamp: '2026-08-20T12:00:00.000Z',
  tags: [],
};

const createPayload: CreateTransactionPayload = {
  title: 'Move money',
  amount: 125,
  type: 'transfer',
  accountId: 'a1',
  destinationAccountId: 'a2',
};

const updatePayload: UpdateTransactionPayload = {
  destinationAccountId: null,
};

describe('transaction transfer types', () => {
  it('model a transfer view and both destination payload forms', () => {
    expect(transferView.destinationAccountId).toBe('a2');
    expect(createPayload.destinationAccountId).toBe('a2');
    expect(updatePayload.destinationAccountId).toBeNull();
  });
});
