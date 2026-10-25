import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import { Debt } from '../../domain/entities/debt.entity';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { GetDebtUseCase } from './get-debt.use-case';
import { RecordDebtIncreaseUseCase } from './record-debt-increase.use-case';
import { RecordDebtPaymentUseCase } from './record-debt-payment.use-case';
import { RevertDebtMovementsUseCase } from './revert-debt-movements.use-case';
import { DebtLedgerAdapter } from '../../infrastructure/debt-ledger.adapter';

const occurredAt = new Date('2026-08-01T00:00:00.000Z');

const aDebt = (
  paymentMode: DebtPaymentMode,
  totalAmount = 1000,
  userId = 'u1',
) =>
  Debt.restore({
    id: 'd1',
    userId,
    name: 'Card',
    totalAmount,
    revolving: true,
    annualInterestRate: null,
    paymentMode,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const effect = {
  userId: 'u1',
  debtId: 'd1',
  transactionId: 't1',
  capitalAmount: 100,
  interestAmount: 20,
  occurredAt,
};

const repos = () => ({
  debts: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn((debt: Debt) => Promise.resolve(debt)),
    delete: jest.fn(),
  },
  movements: {
    findByUserId: jest.fn(),
    findByDebtId: jest.fn(),
    findByTransactionId: jest.fn(),
    save: jest.fn((movement: DebtMovement) => Promise.resolve(movement)),
    deleteByDebtId: jest.fn(),
    deleteById: jest.fn(),
  },
});

const buildGet = (r: ReturnType<typeof repos>) => new GetDebtUseCase(r.debts);

describe('debt effects of linked transactions', () => {
  describe('RecordDebtPaymentUseCase', () => {
    it('reduces only the capital when the debt is in capital mode', async () => {
      const r = repos();
      r.debts.findById.mockResolvedValue(aDebt(DebtPaymentMode.CAPITAL));
      const useCase = new RecordDebtPaymentUseCase(
        r.debts,
        r.movements,
        buildGet(r),
      );

      await useCase.execute(effect);

      expect(r.debts.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 900 }),
      );
      const movement = r.movements.save.mock.calls[0][0];
      expect(movement.kind).toBe(DebtMovementKind.PAYMENT);
      expect(movement.delta).toBe(-100);
      expect(movement.amount).toBe(120);
      expect(movement.interestAmount).toBe(20);
      expect(movement.transactionId).toBe('t1');
      expect(movement.occurredAt).toBe(occurredAt);
    });

    it('reduces the full amount paid when the debt is in total mode', async () => {
      const r = repos();
      r.debts.findById.mockResolvedValue(aDebt(DebtPaymentMode.TOTAL));
      const useCase = new RecordDebtPaymentUseCase(
        r.debts,
        r.movements,
        buildGet(r),
      );

      await useCase.execute(effect);

      expect(r.debts.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 880 }),
      );
      expect(r.movements.save.mock.calls[0][0].delta).toBe(-120);
    });

    it('rejects a payment that would take the balance below zero and saves nothing', async () => {
      const r = repos();
      r.debts.findById.mockResolvedValue(aDebt(DebtPaymentMode.TOTAL, 50));
      const useCase = new RecordDebtPaymentUseCase(
        r.debts,
        r.movements,
        buildGet(r),
      );

      await expect(useCase.execute(effect)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(r.debts.save).not.toHaveBeenCalled();
      expect(r.movements.save).not.toHaveBeenCalled();
    });

    it('fails with not found for a debt of another user', async () => {
      const r = repos();
      r.debts.findById.mockResolvedValue(
        aDebt(DebtPaymentMode.CAPITAL, 1000, 'other'),
      );
      const useCase = new RecordDebtPaymentUseCase(
        r.debts,
        r.movements,
        buildGet(r),
      );

      await expect(useCase.execute(effect)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('RecordDebtIncreaseUseCase', () => {
    it('adds the received amount plus the extra interest to the debt', async () => {
      const r = repos();
      r.debts.findById.mockResolvedValue(aDebt(DebtPaymentMode.CAPITAL, 1000));
      const useCase = new RecordDebtIncreaseUseCase(
        r.debts,
        r.movements,
        buildGet(r),
      );

      await useCase.execute({
        ...effect,
        capitalAmount: 500,
        interestAmount: 25.5,
      });

      expect(r.debts.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 1525.5 }),
      );
      const movement = r.movements.save.mock.calls[0][0];
      expect(movement.kind).toBe(DebtMovementKind.INCREASE);
      expect(movement.delta).toBe(525.5);
      expect(movement.capitalAmount).toBe(500);
      expect(movement.interestAmount).toBe(25.5);
    });
  });

  describe('RevertDebtMovementsUseCase', () => {
    const movementOf = (userId: string, delta: number, debtId = 'd1') =>
      DebtMovement.restore({
        id: `m-${delta}-${userId}`,
        userId,
        debtId,
        kind: DebtMovementKind.PAYMENT,
        delta,
        amount: Math.abs(delta),
        capitalAmount: Math.abs(delta),
        interestAmount: 0,
        transactionId: 't1',
        occurredAt,
        createdAt: occurredAt,
      });

    it('undoes the effect on the debt and deletes the movement', async () => {
      const r = repos();
      r.movements.findByTransactionId.mockResolvedValue([
        movementOf('u1', -100),
      ]);
      r.debts.findById.mockResolvedValue(aDebt(DebtPaymentMode.CAPITAL, 900));
      const useCase = new RevertDebtMovementsUseCase(r.debts, r.movements);

      await useCase.execute('u1', 't1');

      expect(r.debts.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalAmount: 1000 }),
      );
      expect(r.movements.deleteById).toHaveBeenCalledWith('m--100-u1');
    });

    it('skips movements of other users and missing or foreign debts', async () => {
      const r = repos();
      r.movements.findByTransactionId.mockResolvedValue([
        movementOf('other', -100),
        movementOf('u1', -100),
      ]);
      r.debts.findById.mockResolvedValue(null);
      const useCase = new RevertDebtMovementsUseCase(r.debts, r.movements);

      await useCase.execute('u1', 't1');

      expect(r.debts.save).not.toHaveBeenCalled();
      expect(r.movements.deleteById).toHaveBeenCalledTimes(1);
    });

    it('does not revert a debt of another user that shares the movement', async () => {
      const r = repos();
      r.movements.findByTransactionId.mockResolvedValue([
        movementOf('u1', -100),
      ]);
      r.debts.findById.mockResolvedValue(
        aDebt(DebtPaymentMode.CAPITAL, 900, 'other'),
      );
      const useCase = new RevertDebtMovementsUseCase(r.debts, r.movements);

      await useCase.execute('u1', 't1');

      expect(r.debts.save).not.toHaveBeenCalled();
      expect(r.movements.deleteById).toHaveBeenCalledTimes(1);
    });
  });

  describe('DebtLedgerAdapter', () => {
    it('routes payments, increases and reverts to their use cases', async () => {
      const payment = { execute: jest.fn() };
      const increase = { execute: jest.fn() };
      const revert = { execute: jest.fn() };
      const adapter = new DebtLedgerAdapter(
        payment as never,
        increase as never,
        revert as never,
      );

      await adapter.record(
        'u1',
        't1',
        {
          kind: 'payment',
          debtId: 'd1',
          capitalAmount: 100,
          interestAmount: 20,
        },
        occurredAt,
      );
      await adapter.record(
        'u1',
        't2',
        {
          kind: 'increase',
          debtId: 'd1',
          capitalAmount: 500,
          interestAmount: 25,
        },
        occurredAt,
      );
      await adapter.revert('u1', 't1');

      expect(payment.execute).toHaveBeenCalledWith({
        userId: 'u1',
        debtId: 'd1',
        transactionId: 't1',
        capitalAmount: 100,
        interestAmount: 20,
        occurredAt,
      });
      expect(increase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ transactionId: 't2', capitalAmount: 500 }),
      );
      expect(revert.execute).toHaveBeenCalledWith('u1', 't1');
    });
  });
});
