import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Account } from '../../../accounts/domain/entities/account.entity';
import { AccountType } from '../../../accounts/domain/account-type.enum';
import { DebtLink } from '../../domain/debt-link';
import { Transaction } from '../../domain/entities/transaction.entity';
import { TransactionType } from '../../domain/transaction-type.enum';
import { CreateTransactionUseCase } from './create-transaction.use-case';
import { DeleteTransactionUseCase } from './delete-transaction.use-case';
import { UpdateTransactionUseCase } from './update-transaction.use-case';

const account = () =>
  Account.restore({
    id: 'a1',
    userId: 'u1',
    name: 'Checking',
    type: AccountType.DEBIT,
    balance: 1000,
    color: '#2E6B4F',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const paymentLink: DebtLink = {
  kind: 'payment',
  debtId: 'd1',
  capitalAmount: 100,
  interestAmount: 20,
};

const savedTransaction = (debtLink: DebtLink | null = null) =>
  Transaction.restore({
    id: 't1',
    userId: 'u1',
    accountId: 'a1',
    destinationAccountId: null,
    categoryId: null,
    type: TransactionType.EXPENSE,
    title: 'Card',
    amount: 120,
    timestamp: new Date('2026-08-01T00:00:00.000Z'),
    tags: [],
    debtLink,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  });

const deps = () => {
  const transactionRepository = {
    findById: jest.fn(),
    save: jest.fn(async (t: Transaction) => t),
    delete: jest.fn(),
  };
  const accountRepository = {
    findById: jest.fn(async () => account()),
    adjustBalance: jest.fn(),
  };
  const creditCardRepository = { adjustUsedAmount: jest.fn() };
  const categoryRepository = { findById: jest.fn() };
  const debtLedger = { record: jest.fn(), revert: jest.fn() };
  return {
    transactionRepository,
    accountRepository,
    creditCardRepository,
    categoryRepository,
    debtLedger,
  };
};

describe('debt link in transactions', () => {
  describe('CreateTransactionUseCase', () => {
    const build = (d = deps()) => ({
      d,
      useCase: new CreateTransactionUseCase(
        d.transactionRepository as never,
        d.accountRepository as never,
        d.creditCardRepository as never,
        d.categoryRepository as never,
        d.debtLedger,
      ),
    });

    it('records the debt effect and stores the link with the transaction', async () => {
      const { d, useCase } = build();

      const saved = await useCase.execute({
        userId: 'u1',
        accountId: 'a1',
        type: TransactionType.EXPENSE,
        title: 'Card',
        amount: 120,
        debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
      });

      expect(saved.debtLink).toEqual(paymentLink);
      expect(d.debtLedger.record).toHaveBeenCalledWith(
        'u1',
        saved.id,
        paymentLink,
        saved.timestamp,
      );
    });

    it('does not touch the account when the debt rejects the effect', async () => {
      const d = deps();
      d.debtLedger.record.mockRejectedValueOnce(
        new BadRequestException('saldo'),
      );
      const { useCase } = build(d);

      await expect(
        useCase.execute({
          userId: 'u1',
          accountId: 'a1',
          type: TransactionType.EXPENSE,
          title: 'Card',
          amount: 120,
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(d.accountRepository.adjustBalance).not.toHaveBeenCalled();
      expect(d.transactionRepository.save).not.toHaveBeenCalled();
    });

    it('rejects an invalid link with a bad request before any side effect', async () => {
      const d = deps();
      const { useCase } = build(d);

      await expect(
        useCase.execute({
          userId: 'u1',
          accountId: 'a1',
          type: TransactionType.INCOME,
          title: 'Card',
          amount: 120,
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 100 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(d.debtLedger.record).not.toHaveBeenCalled();
    });

    it('does not call the ledger for a plain transaction', async () => {
      const d = deps();
      const { useCase } = build(d);

      await useCase.execute({
        userId: 'u1',
        accountId: 'a1',
        type: TransactionType.EXPENSE,
        title: 'Lunch',
        amount: 10,
      });

      expect(d.debtLedger.record).not.toHaveBeenCalled();
    });
  });

  describe('UpdateTransactionUseCase', () => {
    const build = (d = deps()) => ({
      d,
      useCase: new UpdateTransactionUseCase(
        d.transactionRepository as never,
        d.accountRepository as never,
        d.creditCardRepository as never,
        d.categoryRepository as never,
        d.debtLedger,
      ),
    });

    it('reverts the previous effect and applies the new one', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(paymentLink),
      );
      const { useCase } = build(d);

      await useCase.execute({
        userId: 'u1',
        transactionId: 't1',
        debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 80 },
      });

      expect(d.debtLedger.revert).toHaveBeenCalledWith('u1', 't1');
      expect(d.debtLedger.record).toHaveBeenCalledWith(
        'u1',
        't1',
        {
          kind: 'payment',
          debtId: 'd1',
          capitalAmount: 80,
          interestAmount: 40,
        },
        new Date('2026-08-01T00:00:00.000Z'),
      );
    });

    it('recalculates the kept link over the new amount', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(paymentLink),
      );
      const { useCase } = build(d);

      await useCase.execute({ userId: 'u1', transactionId: 't1', amount: 150 });

      expect(d.debtLedger.record).toHaveBeenCalledWith(
        'u1',
        't1',
        {
          kind: 'payment',
          debtId: 'd1',
          capitalAmount: 100,
          interestAmount: 50,
        },
        expect.any(Date),
      );
    });

    it('removes the link when debtLink is null, reverting its effect only', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(paymentLink),
      );
      const { useCase } = build(d);

      const updated = await useCase.execute({
        userId: 'u1',
        transactionId: 't1',
        debtLink: null,
      });

      expect(updated.debtLink).toBeNull();
      expect(d.debtLedger.revert).toHaveBeenCalledWith('u1', 't1');
      expect(d.debtLedger.record).not.toHaveBeenCalled();
    });

    it('restores the previous effect when the new one is rejected', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(paymentLink),
      );
      d.debtLedger.record
        .mockRejectedValueOnce(new BadRequestException('saldo'))
        .mockResolvedValueOnce(undefined);
      const { useCase } = build(d);

      await expect(
        useCase.execute({
          userId: 'u1',
          transactionId: 't1',
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 80 },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(d.debtLedger.record).toHaveBeenLastCalledWith(
        'u1',
        't1',
        paymentLink,
        new Date('2026-08-01T00:00:00.000Z'),
      );
      expect(d.accountRepository.adjustBalance).not.toHaveBeenCalled();
    });

    it('rethrows the failure when nothing was linked before', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(null),
      );
      d.debtLedger.record.mockRejectedValueOnce(
        new NotFoundException('Debt not found'),
      );
      const { useCase } = build(d);

      await expect(
        useCase.execute({
          userId: 'u1',
          transactionId: 't1',
          debtLink: { kind: 'payment', debtId: 'd1', capitalAmount: 80 },
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(d.debtLedger.revert).not.toHaveBeenCalled();
    });
  });

  describe('DeleteTransactionUseCase', () => {
    it('reverts the debt effect of a linked transaction before deleting it', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(paymentLink),
      );
      const useCase = new DeleteTransactionUseCase(
        d.transactionRepository as never,
        d.accountRepository as never,
        d.creditCardRepository as never,
        d.debtLedger,
      );

      await useCase.execute({ userId: 'u1', transactionId: 't1' });

      expect(d.debtLedger.revert).toHaveBeenCalledWith('u1', 't1');
      expect(d.transactionRepository.delete).toHaveBeenCalledWith('t1');
    });

    it('does not call the ledger for an unlinked transaction', async () => {
      const d = deps();
      d.transactionRepository.findById.mockResolvedValue(
        savedTransaction(null),
      );
      const useCase = new DeleteTransactionUseCase(
        d.transactionRepository as never,
        d.accountRepository as never,
        d.creditCardRepository as never,
        d.debtLedger,
      );

      await useCase.execute({ userId: 'u1', transactionId: 't1' });

      expect(d.debtLedger.revert).not.toHaveBeenCalled();
    });
  });
});
