import { BadRequestException } from '@nestjs/common';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import type { ScheduledTransactionProps } from '../../../scheduled-transactions/domain/entities/scheduled-transaction.entity';
import { ScheduledTransaction } from '../../../scheduled-transactions/domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../../scheduled-transactions/domain/scheduled-transaction-status.enum';
import { BudgetItemType } from '../../domain/budget-item-type.enum';
import {
  MAX_BUDGET_ITEMS,
  MAX_BUDGET_NOTE_LENGTH,
} from '../../domain/budget-limits';
import { GetBudgetTemplateUseCase } from './get-budget-template.use-case';
import {
  aScheduled,
  scheduledRepositoryMock,
} from '../../../scheduled-transactions/application/use-cases/test-doubles';

describe('GetBudgetTemplateUseCase', () => {
  const scheduledRepository = scheduledRepositoryMock();
  let useCase: GetBudgetTemplateUseCase;

  const scheduled = (
    overrides: Partial<ScheduledTransactionProps> = {},
  ): ScheduledTransaction => aScheduled(overrides);

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new GetBudgetTemplateUseCase(scheduledRepository);
  });

  it('reads pending scheduled transactions up to the end of the requested month', async () => {
    scheduledRepository.findByUserId.mockResolvedValue([]);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).resolves.toEqual([]);

    expect(scheduledRepository.findByUserId).toHaveBeenCalledWith('u1', {
      status: ScheduledTransactionStatus.PENDING,
      to: new Date('2026-08-31T23:59:59.999Z'),
      limit: MAX_BUDGET_ITEMS + 1,
    });
  });

  it('groups scheduled transactions by category and budget type, sums amounts and preserves exact notes', async () => {
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled({
        id: 's1',
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title: 'Rent',
        amount: 900,
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 's2',
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title: 'Internet',
        amount: 100,
        scheduledFor: new Date('2026-08-15T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 's3',
        categoryId: 'c1',
        type: TransactionType.INCOME,
        title: 'Salary',
        amount: 3000,
        scheduledFor: new Date('2026-08-25T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 's4',
        categoryId: 'c2',
        type: TransactionType.EXPENSE,
        title: 'Groceries',
        amount: 250,
        scheduledFor: new Date('2026-08-20T00:00:00.000Z'),
        recurring: false,
      }),
    ]);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).resolves.toEqual([
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 1000,
        note: 'Rent, Internet (agenda)',
      },
      {
        categoryId: 'c1',
        type: BudgetItemType.INCOME,
        amount: 3000,
        note: 'Salary (agenda)',
      },
      {
        categoryId: 'c2',
        type: BudgetItemType.EXPENSE,
        amount: 250,
        note: 'Groceries (agenda)',
      },
    ]);
  });

  it('keeps finite grouped sums grouped by category and budget type', async () => {
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled({
        id: 'expense-1',
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title: 'Rent',
        amount: 1200,
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 'expense-2',
        categoryId: 'c1',
        type: TransactionType.EXPENSE,
        title: 'Internet',
        amount: 800,
        scheduledFor: new Date('2026-08-15T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 'income-1',
        categoryId: 'c1',
        type: TransactionType.INCOME,
        title: 'Salary',
        amount: 3000,
        scheduledFor: new Date('2026-08-25T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 'expense-3',
        categoryId: 'c2',
        type: TransactionType.EXPENSE,
        title: 'Groceries',
        amount: 250,
        scheduledFor: new Date('2026-08-20T00:00:00.000Z'),
        recurring: false,
      }),
    ]);

    const items = await useCase.execute({ userId: 'u1', month: '2026-08' });

    expect(items).toEqual([
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 2000,
        note: 'Rent, Internet (agenda)',
      },
      {
        categoryId: 'c1',
        type: BudgetItemType.INCOME,
        amount: 3000,
        note: 'Salary (agenda)',
      },
      {
        categoryId: 'c2',
        type: BudgetItemType.EXPENSE,
        amount: 250,
        note: 'Groceries (agenda)',
      },
    ]);
    expect(items.every((item) => Number.isFinite(item.amount))).toBe(true);
    expect(scheduledRepository.save).not.toHaveBeenCalled();
  });

  it('includes recurring transactions from before a future month but excludes non-recurring and future transactions', async () => {
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled({
        id: 'recurring-past',
        title: 'Recurring rent',
        amount: 1200,
        recurring: true,
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
      }),
      scheduled({
        id: 'non-recurring-past',
        title: 'Old one-off',
        amount: 500,
        recurring: false,
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
      }),
      scheduled({
        id: 'current-month',
        title: 'Future month bill',
        amount: 300,
        recurring: false,
        scheduledFor: new Date('2026-10-15T00:00:00.000Z'),
      }),
      scheduled({
        id: 'recurring-future',
        title: 'Too far ahead',
        amount: 700,
        recurring: true,
        scheduledFor: new Date('2026-11-01T00:00:00.000Z'),
      }),
      scheduled({
        id: 'non-recurring-future',
        title: 'One-off ahead',
        amount: 800,
        recurring: false,
        scheduledFor: new Date('2026-11-01T00:00:00.000Z'),
      }),
    ]);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-10' }),
    ).resolves.toEqual([
      {
        categoryId: 'c1',
        type: BudgetItemType.EXPENSE,
        amount: 1500,
        note: 'Recurring rent, Future month bill (agenda)',
      },
    ]);
  });

  it('excludes transfers, executed or cancelled transactions, other users and uncategorised transactions', async () => {
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled({
        id: 'transfer',
        title: 'Move money',
        type: TransactionType.TRANSFER,
        categoryId: null,
        scheduledFor: new Date('2026-08-10T00:00:00.000Z'),
      }),
      scheduled({
        id: 'executed',
        title: 'Already paid',
        status: ScheduledTransactionStatus.EXECUTED,
        scheduledFor: new Date('2026-08-11T00:00:00.000Z'),
      }),
      scheduled({
        id: 'cancelled',
        title: 'Cancelled bill',
        status: ScheduledTransactionStatus.CANCELLED,
        scheduledFor: new Date('2026-08-12T00:00:00.000Z'),
      }),
      scheduled({
        id: 'other-user',
        userId: 'other-user',
        title: 'Someone else',
        scheduledFor: new Date('2026-08-13T00:00:00.000Z'),
      }),
      scheduled({
        id: 'uncategorised',
        categoryId: null,
        title: 'No category',
        scheduledFor: new Date('2026-08-14T00:00:00.000Z'),
      }),
      scheduled({
        id: 'unsupported',
        type: 'unsupported' as TransactionType,
        title: 'Unsupported type',
        scheduledFor: new Date('2026-08-15T00:00:00.000Z'),
      }),
    ]);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).resolves.toEqual([]);
  });

  it('accepts exactly the maximum number of template items', async () => {
    scheduledRepository.findByUserId.mockResolvedValue(
      Array.from({ length: MAX_BUDGET_ITEMS }, (_, index) =>
        scheduled({
          id: `s${index}`,
          categoryId: `c${index}`,
          title: `Item ${index}`,
          recurring: false,
          scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        }),
      ),
    );

    const items = await useCase.execute({ userId: 'u1', month: '2026-08' });

    expect(items).toHaveLength(MAX_BUDGET_ITEMS);
    expect(items.every((item) => item.note?.endsWith(' (agenda)'))).toBe(true);
  });

  it('rejects an invalid month without reading the schedule', async () => {
    await expect(
      useCase.execute({ userId: 'u1', month: '2026-13' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(scheduledRepository.findByUserId).not.toHaveBeenCalled();
  });

  it('rejects a schedule result beyond the template item bound with BadRequestException', async () => {
    scheduledRepository.findByUserId.mockResolvedValue(
      Array.from({ length: MAX_BUDGET_ITEMS + 1 }, (_, index) =>
        scheduled({
          id: `s${index}`,
          categoryId: `c${index}`,
          title: `Item ${index}`,
          recurring: false,
          scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        }),
      ),
    );

    const result = useCase.execute({ userId: 'u1', month: '2026-08' });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      `A budget template cannot contain more than ${MAX_BUDGET_ITEMS} items`,
    );
  });

  it('accepts a grouped note exactly at the budget note bound', async () => {
    const agendaSuffix = ' (agenda)';
    const title = 'x'.repeat(MAX_BUDGET_NOTE_LENGTH - agendaSuffix.length);
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled({
        title,
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        recurring: false,
      }),
    ]);

    const [item] = await useCase.execute({ userId: 'u1', month: '2026-08' });

    expect(item.note).toBe(`${title}${agendaSuffix}`);
    expect(item.note).toHaveLength(MAX_BUDGET_NOTE_LENGTH);
  });

  it('rejects a grouped note beyond the budget note bound with BadRequestException', async () => {
    scheduledRepository.findByUserId.mockResolvedValue([
      scheduled({
        id: 's1',
        title: 'x'.repeat(250),
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        recurring: false,
      }),
      scheduled({
        id: 's2',
        title: 'y'.repeat(250),
        scheduledFor: new Date('2026-08-01T00:00:00.000Z'),
        recurring: false,
      }),
    ]);

    const result = useCase.execute({ userId: 'u1', month: '2026-08' });

    await expect(result).rejects.toBeInstanceOf(BadRequestException);
    await expect(result).rejects.toThrow(
      `A budget template note cannot exceed ${MAX_BUDGET_NOTE_LENGTH} characters`,
    );
  });
});
