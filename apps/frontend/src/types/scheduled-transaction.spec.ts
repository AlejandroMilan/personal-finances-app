import { describe, expect, it } from 'vitest';
import type {
  CreateScheduledTransactionPayload,
  ExecuteScheduledTransactionPayload,
  ScheduledTransactionView,
  UpdateScheduledTransactionPayload,
} from './scheduled-transaction';

const transferScheduled: ScheduledTransactionView = {
  id: 's1',
  accountId: 'a1',
  destinationAccountId: 'a2',
  categoryId: null,
  type: 'transfer',
  title: 'Move money',
  amount: 125,
  tags: [],
  scheduledFor: '2026-08-20T00:00:00.000Z',
  recurring: true,
  status: 'pending',
  transactionId: null,
};

describe('scheduled transaction transfer types', () => {
  it('represent a transfer with source and destination accounts and no category', () => {
    expect(transferScheduled).toMatchObject({
      type: 'transfer',
      accountId: 'a1',
      destinationAccountId: 'a2',
      categoryId: null,
    });
  });

  it('allow the destination account in create, update and execute payloads', () => {
    const createPayload: CreateScheduledTransactionPayload = {
      title: 'Move money',
      amount: 125,
      type: 'transfer',
      accountId: 'a1',
      destinationAccountId: 'a2',
      scheduledFor: '2026-08-20T00:00:00.000Z',
    };
    const updatePayload: UpdateScheduledTransactionPayload = {
      accountId: 'a2',
      destinationAccountId: 'a1',
    };
    const executePayload: ExecuteScheduledTransactionPayload = {
      accountId: 'a1',
      destinationAccountId: 'a2',
      rescheduleFor: '2026-09-20T00:00:00.000Z',
    };

    expect(createPayload.destinationAccountId).toBe('a2');
    expect(updatePayload.destinationAccountId).toBe('a1');
    expect(executePayload.destinationAccountId).toBe('a2');
    expect(executePayload.rescheduleFor).toBe('2026-09-20T00:00:00.000Z');
  });
});
