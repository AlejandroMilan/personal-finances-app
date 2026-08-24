import {
  Budget,
  BudgetItemType,
  type BudgetProps,
} from '../../domain/entities/budget.entity';
import { ListBudgetsUseCase } from './list-budgets.use-case';

describe('ListBudgetsUseCase', () => {
  const budgetRepository = {
    findByMonth: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    deleteByMonth: jest.fn(),
  };
  let useCase: ListBudgetsUseCase;

  const budget = (overrides: Partial<BudgetProps> = {}): Budget =>
    Budget.restore({
      id: 'b1',
      userId: 'u1',
      month: '2026-08',
      items: [
        { categoryId: 'c1', type: BudgetItemType.EXPENSE, amount: 250 },
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListBudgetsUseCase(budgetRepository);
  });

  it('lists only the budgets of the authenticated user without filters', async () => {
    const budgets = [budget()];
    budgetRepository.list.mockResolvedValue(budgets);

    await expect(useCase.execute({ userId: 'u1' })).resolves.toBe(budgets);

    expect(budgetRepository.list).toHaveBeenCalledWith('u1', {});
  });

  it('forwards both optional month filters to the repository', async () => {
    budgetRepository.list.mockResolvedValue([]);

    await useCase.execute({
      userId: 'u1',
      from: '2026-01',
      to: '2026-12',
    });

    expect(budgetRepository.list).toHaveBeenCalledWith('u1', {
      from: '2026-01',
      to: '2026-12',
    });
  });

  it('forwards an explicit limit together with the user and month filters', async () => {
    budgetRepository.list.mockResolvedValue([]);

    await useCase.execute({
      userId: 'u1',
      from: '2026-01',
      to: '2026-12',
      limit: 50,
    });

    expect(budgetRepository.list).toHaveBeenCalledWith('u1', {
      from: '2026-01',
      to: '2026-12',
      limit: 50,
    });
  });

  it('forwards a single month boundary without inventing the other one', async () => {
    budgetRepository.list.mockResolvedValue([]);

    await useCase.execute({ userId: 'u1', from: '2026-01' });

    expect(budgetRepository.list).toHaveBeenCalledWith('u1', {
      from: '2026-01',
    });
  });
});
