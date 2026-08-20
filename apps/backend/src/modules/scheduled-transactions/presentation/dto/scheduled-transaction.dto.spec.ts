import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { CreateScheduledTransactionDto } from './create-scheduled-transaction.dto';
import { ExecuteScheduledTransactionDto } from './execute-scheduled-transaction.dto';
import { ListScheduledTransactionsDto } from './list-scheduled-transactions.dto';
import { UpdateScheduledTransactionDto } from './update-scheduled-transaction.dto';

const validate = <T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
) =>
  validateSync(plainToInstance(cls, payload), {
    whitelist: true,
    forbidNonWhitelisted: false,
  });

const properties = (errors: { property: string }[]) =>
  errors.map((error) => error.property);

describe('CreateScheduledTransactionDto', () => {
  const valid = {
    title: 'Rent',
    amount: 12000,
    type: TransactionType.EXPENSE,
    accountId: 'a1',
    scheduledFor: '2026-09-01T00:00:00.000Z',
  };

  it('accepts a valid payload', () => {
    expect(validate(CreateScheduledTransactionDto, valid)).toHaveLength(0);
  });

  it('accepts the optional fields', () => {
    expect(
      validate(CreateScheduledTransactionDto, {
        ...valid,
        categoryId: 'c1',
        recurring: true,
        tags: ['home'],
      }),
    ).toHaveLength(0);
  });

  it.each([0, -1])('rejects an amount of %p', (amount) => {
    expect(
      properties(validate(CreateScheduledTransactionDto, { ...valid, amount })),
    ).toContain('amount');
  });

  it('rejects a type outside income and expense', () => {
    expect(
      properties(
        validate(CreateScheduledTransactionDto, { ...valid, type: 'transfer' }),
      ),
    ).toContain('type');
  });

  it('rejects a scheduledFor that is not an ISO date', () => {
    expect(
      properties(
        validate(CreateScheduledTransactionDto, {
          ...valid,
          scheduledFor: 'next month',
        }),
      ),
    ).toContain('scheduledFor');
  });

  it('rejects a missing scheduledFor', () => {
    const withoutDate: Record<string, unknown> = { ...valid };
    delete withoutDate.scheduledFor;

    expect(
      properties(validate(CreateScheduledTransactionDto, withoutDate)),
    ).toContain('scheduledFor');
  });

  it('rejects a blank title', () => {
    expect(
      properties(
        validate(CreateScheduledTransactionDto, { ...valid, title: '' }),
      ),
    ).toContain('title');
  });

  it('rejects a recurring flag that is not a boolean', () => {
    expect(
      properties(
        validate(CreateScheduledTransactionDto, { ...valid, recurring: 'yes' }),
      ),
    ).toContain('recurring');
  });

  it('drops fields that are not declared', () => {
    const instance = plainToInstance(CreateScheduledTransactionDto, {
      ...valid,
      userId: 'someone-else',
      status: ScheduledTransactionStatus.EXECUTED,
    });

    validateSync(instance, { whitelist: true });

    expect(instance).not.toHaveProperty('userId');
    expect(instance).not.toHaveProperty('status');
  });
});

describe('UpdateScheduledTransactionDto', () => {
  it('accepts an empty payload', () => {
    expect(validate(UpdateScheduledTransactionDto, {})).toHaveLength(0);
  });

  it('accepts clearing the category with null', () => {
    expect(
      validate(UpdateScheduledTransactionDto, { categoryId: null }),
    ).toHaveLength(0);
  });

  it('rejects an amount that is not positive', () => {
    expect(
      properties(validate(UpdateScheduledTransactionDto, { amount: -1 })),
    ).toContain('amount');
  });

  it('rejects a scheduledFor that is not an ISO date', () => {
    expect(
      properties(
        validate(UpdateScheduledTransactionDto, { scheduledFor: 'soon' }),
      ),
    ).toContain('scheduledFor');
  });
});

describe('ListScheduledTransactionsDto', () => {
  it('accepts an empty query', () => {
    expect(validate(ListScheduledTransactionsDto, {})).toHaveLength(0);
  });

  it.each(Object.values(ScheduledTransactionStatus))(
    'accepts the status %s',
    (status) => {
      expect(validate(ListScheduledTransactionsDto, { status })).toHaveLength(
        0,
      );
    },
  );

  it('rejects a status outside the enum', () => {
    expect(
      properties(validate(ListScheduledTransactionsDto, { status: 'done' })),
    ).toContain('status');
  });

  it('rejects a range that is not made of ISO dates', () => {
    expect(
      properties(
        validate(ListScheduledTransactionsDto, { from: 'today', to: 'later' }),
      ).sort(),
    ).toEqual(['from', 'to']);
  });
});

describe('ExecuteScheduledTransactionDto', () => {
  it('accepts an empty payload', () => {
    expect(validate(ExecuteScheduledTransactionDto, {})).toHaveLength(0);
  });

  it('accepts the confirmed adjustments and the reschedule date', () => {
    expect(
      validate(ExecuteScheduledTransactionDto, {
        amount: 12500,
        timestamp: '2026-08-20T00:00:00.000Z',
        accountId: 'a2',
        categoryId: 'c2',
        rescheduleFor: '2026-10-01T00:00:00.000Z',
      }),
    ).toHaveLength(0);
  });

  it('accepts clearing the category with null', () => {
    expect(
      validate(ExecuteScheduledTransactionDto, { categoryId: null }),
    ).toHaveLength(0);
  });

  it('rejects an amount that is not positive', () => {
    expect(
      properties(validate(ExecuteScheduledTransactionDto, { amount: 0 })),
    ).toContain('amount');
  });

  it('accepts the reschedule flag on its own', () => {
    expect(
      validate(ExecuteScheduledTransactionDto, { reschedule: true }),
    ).toHaveLength(0);
  });

  it('rejects a reschedule flag that is not a boolean', () => {
    expect(
      properties(
        validate(ExecuteScheduledTransactionDto, { reschedule: 'yes' }),
      ),
    ).toContain('reschedule');
  });

  it('rejects a rescheduleFor that is not an ISO date', () => {
    expect(
      properties(
        validate(ExecuteScheduledTransactionDto, { rescheduleFor: 'later' }),
      ),
    ).toContain('rescheduleFor');
  });

  it('drops a userId injected in the body', () => {
    const instance = plainToInstance(ExecuteScheduledTransactionDto, {
      userId: 'someone-else',
    });

    validateSync(instance, { whitelist: true });

    expect(instance).not.toHaveProperty('userId');
  });
});
