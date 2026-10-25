import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Debt } from '../../../debts/domain/entities/debt.entity';
import { DebtPaymentMode } from '../../../debts/domain/debt-payment-mode.enum';
import { DebtLink } from '../../../transactions/domain/debt-link';
import { TransactionType } from '../../../transactions/domain/transaction-type.enum';
import { ScheduledTransaction } from '../../domain/entities/scheduled-transaction.entity';
import { ScheduledTransactionStatus } from '../../domain/scheduled-transaction-status.enum';
import { CreateScheduledTransactionUseCase } from './create-scheduled-transaction.use-case';
import { ExecuteScheduledTransactionUseCase } from './execute-scheduled-transaction.use-case';
import { UpdateScheduledTransactionUseCase } from './update-scheduled-transaction.use-case';
import {
  accountRepositoryMock,
  anAccount,
  categoryRepositoryMock,
  scheduledRepositoryMock,
} from './test-doubles';

const scheduledFor = new Date('2026-09-01T00:00:00.000Z');
const link: DebtLink = {
  kind: 'payment',
  debtId: 'd1',
  capitalAmount: 100,
  interestAmount: 20,
};

const aDebt = (userId = 'u1') =>
  Debt.restore({
    id: 'd1',
    userId,
    name: 'Card',
    totalAmount: 1000,
    revolving: true,
    annualInterestRate: null,
    paymentMode: DebtPaymentMode.CAPITAL,
    createdAt: scheduledFor,
    updatedAt: scheduledFor,
  });

const existingScheduled = (debtLink: DebtLink | null = link) =>
  ScheduledTransaction.restore({
    id: 's1',
    userId: 'u1',
    accountId: 'a1',
    destinationAccountId: null,
    categoryId: null,
    type: TransactionType.EXPENSE,
    title: 'Card',
    amount: 120,
    tags: [],
    scheduledFor,
    recurring: true,
    status: ScheduledTransactionStatus.PENDING,
    transactionId: null,
    debtLink,
    createdAt: scheduledFor,
    updatedAt: scheduledFor,
  });

const deps = () => {
  const scheduled = scheduledRepositoryMock();
  const accounts = accountRepositoryMock();
  const categories = categoryRepositoryMock();
  const debts = { findById: jest.fn(async () => aDebt()) };
  scheduled.save.mockImplementation(async (s: ScheduledTransaction) => s);
  accounts.findById.mockResolvedValue(anAccount());
  return { scheduled, accounts, categories, debts };
};

describe('scheduled transactions linked to debts', () => {
  describe('CreateScheduledTransactionUseCase', () => {
    const input = {
      userId: 'u1',
      accountId: 'a1',
      type: TransactionType.EXPENSE,
      title: 'Card',
      amount: 120,
      scheduledFor,
    };

    it('stores the validated link when the debt belongs to the user', async () => {
      const d = deps();
      const useCase = new CreateScheduledTransactionUseCase(
        d.scheduled,
        d.accounts,
        d.categories,
        d.debts as never,
      );

      const saved = await useCase.execute({
        ...input,
        debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
      });

      expect(saved.debtLink).toEqual(link);
    });

    it('rejects a debt of another user with not found', async () => {
      const d = deps();
      d.debts.findById.mockResolvedValueOnce(aDebt('other'));
      const useCase = new CreateScheduledTransactionUseCase(
        d.scheduled,
        d.accounts,
        d.categories,
        d.debts as never,
      );

      await expect(
        useCase.execute({
          ...input,
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(d.scheduled.save).not.toHaveBeenCalled();
    });

    it('rejects an incompatible link with a bad request', async () => {
      const d = deps();
      const useCase = new CreateScheduledTransactionUseCase(
        d.scheduled,
        d.accounts,
        d.categories,
        d.debts as never,
      );

      await expect(
        useCase.execute({
          ...input,
          type: TransactionType.INCOME,
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('UpdateScheduledTransactionUseCase', () => {
    const build = (d = deps()) =>
      new UpdateScheduledTransactionUseCase(
        d.scheduled,
        d.accounts,
        d.categories,
        d.debts as never,
      );

    it('keeps the stored link, recalculating its interest on the new amount', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled());

      const updated = await build(d).execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
        amount: 150,
      });

      expect(updated.debtLink).toEqual({
        kind: 'payment',
        debtId: 'd1',
        capitalAmount: 100,
        interestAmount: 50,
      });
    });

    it('replaces the link when a new one is given and checks its owner', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled());

      const updated = await build(d).execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
        debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 50 },
      });

      expect(d.debts.findById).toHaveBeenCalledWith('d1');
      expect(updated.debtLink).toEqual({
        kind: 'payment',
        debtId: 'd1',
        capitalAmount: 50,
        interestAmount: 70,
      });
    });

    it('removes the link when debtLink is null', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled());

      const updated = await build(d).execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
        debtLink: null,
      });

      expect(updated.debtLink).toBeNull();
      expect(d.debts.findById).not.toHaveBeenCalled();
    });

    it('does not link a debt of another user', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled(null));
      d.debts.findById.mockResolvedValueOnce(aDebt('other'));

      await expect(
        build(d).execute({
          userId: 'u1',
          scheduledTransactionId: 's1',
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 50 },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('ExecuteScheduledTransactionUseCase', () => {
    const build = (
      scheduled: ReturnType<typeof scheduledRepositoryMock>,
      createTransaction: jest.Mock,
    ) =>
      new ExecuteScheduledTransactionUseCase(scheduled, {
        execute: createTransaction,
      } as never);

    it('passes the scheduled link with its capital to the transaction', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled());
      const createTransaction = jest.fn(async () => ({ id: 't1' }));

      await build(d.scheduled, createTransaction).execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
      });

      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
        }),
      );
    });

    it('lets the execution override the capital of the payment', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled());
      const createTransaction = jest.fn(async () => ({ id: 't1' }));

      await build(d.scheduled, createTransaction).execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
        debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 90 },
      });

      expect(createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 120,
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 90 },
        }),
      );
    });

    it('sends no link when the execution removes it or the schedule had none', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled(null));
      const createTransaction = jest.fn(async () => ({ id: 't1' }));
      const useCase = build(d.scheduled, createTransaction);

      await useCase.execute({ userId: 'u1', scheduledTransactionId: 's1' });
      expect(createTransaction).toHaveBeenLastCalledWith(
        expect.objectContaining({ debtLink: null }),
      );

      d.scheduled.findById.mockResolvedValue(existingScheduled());
      await useCase.execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
        debtLink: null,
      });
      expect(createTransaction).toHaveBeenLastCalledWith(
        expect.objectContaining({ debtLink: null }),
      );
    });

    it('carries the link over to the next recurring occurrence', async () => {
      const d = deps();
      d.scheduled.findById.mockResolvedValue(existingScheduled());
      const createTransaction = jest.fn(async () => ({ id: 't1' }));

      const result = await build(d.scheduled, createTransaction).execute({
        userId: 'u1',
        scheduledTransactionId: 's1',
        reschedule: true,
      });

      expect(result.next?.debtLink).toEqual(link);
    });
  });
});
