import { Test, TestingModule } from '@nestjs/testing';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { CreateDebtUseCase } from '../application/use-cases/create-debt.use-case';
import { DeleteDebtUseCase } from '../application/use-cases/delete-debt.use-case';
import { GetDebtUseCase } from '../application/use-cases/get-debt.use-case';
import { ListDebtMovementsUseCase } from '../application/use-cases/list-debt-movements.use-case';
import { ListDebtsUseCase } from '../application/use-cases/list-debts.use-case';
import { UpdateDebtUseCase } from '../application/use-cases/update-debt.use-case';
import { DebtMovement } from '../domain/entities/debt-movement.entity';
import { Debt } from '../domain/entities/debt.entity';
import { DebtMovementKind } from '../domain/debt-movement-kind.enum';
import { DebtPaymentMode } from '../domain/debt-payment-mode.enum';
import { DebtsController } from './debts.controller';

describe('DebtsController', () => {
  let controller: DebtsController;
  const useCases = {
    create: { execute: jest.fn() },
    list: { execute: jest.fn() },
    get: { execute: jest.fn() },
    update: { execute: jest.fn() },
    remove: { execute: jest.fn() },
    movements: { execute: jest.fn() },
  };
  const user = { id: 'u1', email: 'ana@mail.com' };
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const debt = () =>
    Debt.restore({
      id: 'd1',
      userId: 'u1',
      name: 'Card',
      totalAmount: 500,
      revolving: true,
      annualInterestRate: null,
      paymentMode: DebtPaymentMode.CAPITAL,
      createdAt,
      updatedAt: createdAt,
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebtsController],
      providers: [
        { provide: CreateDebtUseCase, useValue: useCases.create },
        { provide: ListDebtsUseCase, useValue: useCases.list },
        { provide: GetDebtUseCase, useValue: useCases.get },
        { provide: UpdateDebtUseCase, useValue: useCases.update },
        { provide: DeleteDebtUseCase, useValue: useCases.remove },
        { provide: ListDebtMovementsUseCase, useValue: useCases.movements },
        {
          provide: TOKEN_SERVICE,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(DebtsController);
  });

  it('creates a debt for the current user and returns its view', async () => {
    useCases.create.execute.mockResolvedValue(debt());

    const view = await controller.create(user, {
      name: 'Card',
      totalAmount: 500,
      revolving: true,
    });

    expect(useCases.create.execute).toHaveBeenCalledWith({
      userId: 'u1',
      name: 'Card',
      totalAmount: 500,
      revolving: true,
    });
    expect(view).toMatchObject({ id: 'd1', totalAmount: 500 });
  });

  it('lists, gets, updates and deletes debts scoped to the user', async () => {
    useCases.list.execute.mockResolvedValue([debt()]);
    useCases.get.execute.mockResolvedValue(debt());
    useCases.update.execute.mockResolvedValue(debt());

    expect(await controller.list(user)).toHaveLength(1);
    expect(await controller.get(user, 'd1')).toMatchObject({ id: 'd1' });
    expect(
      await controller.update(user, 'd1', { name: 'Other' }),
    ).toMatchObject({ id: 'd1' });
    await controller.remove(user, 'd1');

    expect(useCases.get.execute).toHaveBeenCalledWith('u1', 'd1');
    expect(useCases.update.execute).toHaveBeenCalledWith({
      userId: 'u1',
      debtId: 'd1',
      name: 'Other',
    });
    expect(useCases.remove.execute).toHaveBeenCalledWith('u1', 'd1');
  });

  it('maps the movement log to views with balances', async () => {
    useCases.movements.execute.mockResolvedValue([
      {
        movement: DebtMovement.restore({
          id: 'm1',
          userId: 'u1',
          debtId: 'd1',
          kind: DebtMovementKind.INITIAL,
          delta: 500,
          amount: 500,
          capitalAmount: 500,
          interestAmount: 0,
          transactionId: null,
          occurredAt: createdAt,
          createdAt,
        }),
        balanceBefore: 0,
        balanceAfter: 500,
      },
    ]);

    const views = await controller.movements(user, { debtId: 'd1' });

    expect(useCases.movements.execute).toHaveBeenCalledWith({
      userId: 'u1',
      debtId: 'd1',
    });
    expect(views[0]).toMatchObject({
      id: 'm1',
      balanceAfter: 500,
      kind: DebtMovementKind.INITIAL,
    });
  });
});
