import { NotFoundException } from '@nestjs/common';
import {
  Budget,
  BudgetItemType,
  type BudgetProps,
} from '../../domain/entities/budget.entity';
import { GetBudgetUseCase } from './get-budget.use-case';

describe('GetBudgetUseCase', () => {
  const budgetRepository = {
    findByMonth: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    deleteByMonth: jest.fn(),
  };
  let useCase: GetBudgetUseCase;

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
    useCase = new GetBudgetUseCase(budgetRepository);
  });

  it('returns the budget for the requested user and month', async () => {
    const found = budget();
    budgetRepository.findByMonth.mockResolvedValue(found);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).resolves.toBe(found);

    expect(budgetRepository.findByMonth).toHaveBeenCalledWith('u1', '2026-08');
  });

  it('throws NotFoundException when the month has no budget', async () => {
    budgetRepository.findByMonth.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when the found budget belongs to another user', async () => {
    budgetRepository.findByMonth.mockResolvedValue(budget({ userId: 'other' }));

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).rejects.toThrow(NotFoundException);
  });
});
