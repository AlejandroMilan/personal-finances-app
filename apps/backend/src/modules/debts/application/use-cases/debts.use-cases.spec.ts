import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DebtMovement } from '../../domain/entities/debt-movement.entity';
import { Debt } from '../../domain/entities/debt.entity';
import { DebtMovementKind } from '../../domain/debt-movement-kind.enum';
import { DebtPaymentMode } from '../../domain/debt-payment-mode.enum';
import { CreateDebtUseCase } from './create-debt.use-case';
import { DeleteDebtUseCase } from './delete-debt.use-case';
import { GetDebtUseCase } from './get-debt.use-case';
import { ListDebtMovementsUseCase } from './list-debt-movements.use-case';
import { ListDebtsUseCase } from './list-debts.use-case';
import { UpdateDebtUseCase } from './update-debt.use-case';

const debtRepo = () => ({
  findById: jest.fn(),
  findByUserId: jest.fn(),
  save: jest.fn((debt: Debt) => Promise.resolve(debt)),
  delete: jest.fn(),
});
const movementRepo = () => ({
  findByUserId: jest.fn(),
  findByDebtId: jest.fn(),
  save: jest.fn((movement: DebtMovement) => Promise.resolve(movement)),
  deleteByDebtId: jest.fn(),
});

const aDebt = (totalAmount = 1000, userId = 'u1') =>
  Debt.restore({
    id: 'd1',
    userId,
    name: 'Card',
    totalAmount,
    revolving: true,
    annualInterestRate: null,
    paymentMode: DebtPaymentMode.CAPITAL,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });

const aMovement = (
  kind: DebtMovementKind,
  delta: number,
  occurredAt = '2026-01-02T00:00:00.000Z',
  debtId = 'd1',
) =>
  DebtMovement.restore({
    id: `${kind}-${delta}-${debtId}-${occurredAt}`,
    userId: 'u1',
    debtId,
    kind,
    delta,
    amount: Math.abs(delta),
    capitalAmount: Math.abs(delta),
    interestAmount: 0,
    transactionId: null,
    occurredAt: new Date(occurredAt),
    createdAt: new Date(occurredAt),
  });

describe('debts use cases', () => {
  describe('CreateDebtUseCase', () => {
    it('saves the debt and an initial movement with the full balance', async () => {
      const debts = debtRepo();
      const movements = movementRepo();
      const useCase = new CreateDebtUseCase(debts, movements as never);

      const debt = await useCase.execute({
        userId: 'u1',
        name: 'Car',
        totalAmount: 5000,
        revolving: false,
        annualInterestRate: 12,
      });

      expect(debt.totalAmount).toBe(5000);
      expect(debts.save).toHaveBeenCalledWith(debt);
      const saved = movements.save.mock.calls[0][0];
      expect(saved.kind).toBe(DebtMovementKind.INITIAL);
      expect(saved.delta).toBe(5000);
      expect(saved.debtId).toBe(debt.id);
    });

    it('maps domain violations to a bad request', async () => {
      const useCase = new CreateDebtUseCase(
        debtRepo(),
        movementRepo() as never,
      );
      await expect(
        useCase.execute({
          userId: 'u1',
          name: ' ',
          totalAmount: 1,
          revolving: true,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('GetDebtUseCase and ListDebtsUseCase', () => {
    it('returns an owned debt and rejects a debt of another user', async () => {
      const debts = debtRepo();
      const useCase = new GetDebtUseCase(debts);

      debts.findById.mockResolvedValueOnce(aDebt());
      await expect(useCase.execute('u1', 'd1')).resolves.toBeInstanceOf(Debt);

      debts.findById.mockResolvedValueOnce(aDebt(1000, 'other'));
      await expect(useCase.execute('u1', 'd1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      debts.findById.mockResolvedValueOnce(null);
      await expect(useCase.execute('u1', 'd1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists the debts of the user', async () => {
      const debts = debtRepo();
      debts.findByUserId.mockResolvedValue([aDebt()]);

      await expect(
        new ListDebtsUseCase(debts as never).execute('u1'),
      ).resolves.toHaveLength(1);
      expect(debts.findByUserId).toHaveBeenCalledWith('u1');
    });
  });

  describe('UpdateDebtUseCase', () => {
    const build = (debts = debtRepo(), movements = movementRepo()) => {
      const getDebt = new GetDebtUseCase(debts);
      return {
        debts,
        movements,
        useCase: new UpdateDebtUseCase(debts, movements as never, getDebt),
      };
    };

    it('updates the fields without logging a movement when the total is unchanged', async () => {
      const { debts, movements, useCase } = build();
      debts.findById.mockResolvedValue(aDebt(1000));

      const updated = await useCase.execute({
        userId: 'u1',
        debtId: 'd1',
        name: 'New',
        totalAmount: 1000,
      });

      expect(updated.name).toBe('New');
      expect(movements.save).not.toHaveBeenCalled();
    });

    it('logs an adjustment movement with the signed difference when the total changes', async () => {
      const { debts, movements, useCase } = build();
      debts.findById.mockResolvedValue(aDebt(1000));

      const updated = await useCase.execute({
        userId: 'u1',
        debtId: 'd1',
        totalAmount: 800,
      });

      expect(updated.totalAmount).toBe(800);
      const adjustment = movements.save.mock.calls[0][0];
      expect(adjustment.kind).toBe(DebtMovementKind.ADJUSTMENT);
      expect(adjustment.delta).toBe(-200);
      expect(adjustment.amount).toBe(200);
    });

    it('refuses an adjustment that would make the balance negative', async () => {
      const { debts, useCase } = build();
      debts.findById.mockResolvedValue(aDebt(100));

      await expect(
        useCase.execute({ userId: 'u1', debtId: 'd1', totalAmount: -5 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(debts.save).not.toHaveBeenCalled();
    });

    it('does not touch debts of another user', async () => {
      const { debts, useCase } = build();
      debts.findById.mockResolvedValue(aDebt(1000, 'other'));

      await expect(
        useCase.execute({ userId: 'u1', debtId: 'd1', name: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('DeleteDebtUseCase', () => {
    const build = (debts = debtRepo(), movements = movementRepo()) => ({
      debts,
      movements,
      useCase: new DeleteDebtUseCase(
        debts,
        movements as never,
        new GetDebtUseCase(debts),
      ),
    });

    it('deletes a debt that only has its initial movement', async () => {
      const { debts, movements, useCase } = build();
      debts.findById.mockResolvedValue(aDebt());
      movements.findByDebtId.mockResolvedValue([
        aMovement(DebtMovementKind.INITIAL, 1000),
      ]);

      await useCase.execute('u1', 'd1');

      expect(movements.deleteByDebtId).toHaveBeenCalledWith('d1');
      expect(debts.delete).toHaveBeenCalledWith('d1');
    });

    it('refuses to delete a debt with activity', async () => {
      const { debts, movements, useCase } = build();
      debts.findById.mockResolvedValue(aDebt());
      movements.findByDebtId.mockResolvedValue([
        aMovement(DebtMovementKind.INITIAL, 1000),
        aMovement(DebtMovementKind.PAYMENT, -100),
      ]);

      await expect(useCase.execute('u1', 'd1')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(debts.delete).not.toHaveBeenCalled();
    });
  });

  describe('ListDebtMovementsUseCase', () => {
    it('returns the general log newest first with balances per debt', async () => {
      const movements = movementRepo();
      movements.findByUserId.mockResolvedValue([
        aMovement(DebtMovementKind.INITIAL, 1000, '2026-01-01T00:00:00.000Z'),
        aMovement(DebtMovementKind.PAYMENT, -100, '2026-02-01T00:00:00.000Z'),
      ]);

      const result = await new ListDebtMovementsUseCase(
        movements as never,
      ).execute({ userId: 'u1' });

      expect(result.map((r) => r.balanceAfter)).toEqual([900, 1000]);
    });

    it('filters by debt while computing balances from the full history', async () => {
      const movements = movementRepo();
      const other = aMovement(
        DebtMovementKind.INITIAL,
        50,
        '2026-01-01T00:00:00.000Z',
        'd2',
      );
      movements.findByUserId.mockResolvedValue([
        aMovement(DebtMovementKind.INITIAL, 1000, '2026-01-01T00:00:00.000Z'),
        aMovement(DebtMovementKind.PAYMENT, -100, '2026-02-01T00:00:00.000Z'),
        other,
      ]);

      const result = await new ListDebtMovementsUseCase(
        movements as never,
      ).execute({
        userId: 'u1',
        debtId: 'd1',
      });

      expect(result).toHaveLength(2);
      expect(result[0].balanceBefore).toBe(1000);
      expect(result.every((r) => r.movement.debtId === 'd1')).toBe(true);
    });
  });
});
