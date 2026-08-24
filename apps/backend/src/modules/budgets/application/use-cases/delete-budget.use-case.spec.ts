import { NotFoundException } from '@nestjs/common';
import {
  Budget,
  BudgetItemType,
} from '../../domain/entities/budget.entity';
import { DeleteBudgetUseCase } from './delete-budget.use-case';

describe('DeleteBudgetUseCase', () => {
  const budgetRepository = {
    findByMonth: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    deleteByMonth: jest.fn(),
  };
  let useCase: DeleteBudgetUseCase;

  const existingBudget = (userId = 'u1'): Budget =>
    Budget.restore({
      id: 'b1',
      userId,
      month: '2026-08',
      items: [
        { categoryId: 'c1', type: BudgetItemType.EXPENSE, amount: 250 },
      ],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteBudgetUseCase(budgetRepository);
  });

  it('deletes the budget belonging to the authenticated user and month', async () => {
    budgetRepository.findByMonth.mockResolvedValue(existingBudget());

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).resolves.toBeUndefined();

    expect(budgetRepository.deleteByMonth).toHaveBeenCalledWith(
      'u1',
      '2026-08',
    );
  });

  it('throws NotFoundException when the budget does not exist', async () => {
    budgetRepository.findByMonth.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).rejects.toThrow(NotFoundException);
    expect(budgetRepository.deleteByMonth).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the budget belongs to another user', async () => {
    budgetRepository.findByMonth.mockResolvedValue(existingBudget('other'));

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08' }),
    ).rejects.toThrow(NotFoundException);
    expect(budgetRepository.deleteByMonth).not.toHaveBeenCalled();
  });
});
