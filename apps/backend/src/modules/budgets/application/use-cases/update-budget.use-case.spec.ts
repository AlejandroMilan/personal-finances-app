import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  Budget,
  BudgetItemType,
  type BudgetItem,
  type BudgetProps,
} from '../../domain/entities/budget.entity';
import { UpdateBudgetUseCase } from './update-budget.use-case';

describe('UpdateBudgetUseCase', () => {
  const budgetRepository = {
    findByMonth: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    deleteByMonth: jest.fn(),
  };
  let useCase: UpdateBudgetUseCase;

  const item = (overrides: Partial<BudgetItem> = {}): BudgetItem => ({
    categoryId: 'c1',
    type: BudgetItemType.EXPENSE,
    amount: 250,
    ...overrides,
  });

  const budget = (overrides: Partial<BudgetProps> = {}): Budget =>
    Budget.restore({
      id: 'b1',
      userId: 'u1',
      month: '2026-08',
      items: [item()],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateBudgetUseCase(budgetRepository);
  });

  it('replaces all budget items while preserving the budget identity', async () => {
    const existing = budget();
    const replacement = [
      item({
        categoryId: 'c2',
        type: BudgetItemType.INCOME,
        amount: 3000,
        note: 'Salary',
      }),
    ];
    budgetRepository.findByMonth.mockResolvedValue(existing);
    budgetRepository.save.mockImplementation(async (saved: Budget) => saved);

    const result = await useCase.execute({
      userId: 'u1',
      month: '2026-08',
      items: replacement,
    });

    expect(budgetRepository.findByMonth).toHaveBeenCalledWith('u1', '2026-08');
    expect(budgetRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'b1',
        userId: 'u1',
        month: '2026-08',
        items: replacement,
        createdAt: existing.createdAt,
      }),
    );
    expect(result.id).toBe('b1');
    expect(result.items).toEqual(replacement);
    expect(result.items).not.toEqual(existing.items);
    expect(result.updatedAt).not.toBe(existing.updatedAt);
  });

  it('throws NotFoundException when the budget does not exist', async () => {
    budgetRepository.findByMonth.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08', items: [] }),
    ).rejects.toThrow(NotFoundException);
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the budget belongs to another user', async () => {
    budgetRepository.findByMonth.mockResolvedValue(budget({ userId: 'other' }));

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08', items: [] }),
    ).rejects.toThrow(NotFoundException);
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('maps invalid replacement items to BadRequestException', async () => {
    budgetRepository.findByMonth.mockResolvedValue(budget());

    await expect(
      useCase.execute({
        userId: 'u1',
        month: '2026-08',
        items: [item({ amount: 0 })],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('maps a duplicate-key race while updating to ConflictException', async () => {
    budgetRepository.findByMonth.mockResolvedValue(budget());
    budgetRepository.save.mockRejectedValue({ code: 11000 });

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08', items: [item()] }),
    ).rejects.toThrow(ConflictException);
  });

  it('rethrows unexpected repository errors', async () => {
    const error = new Error('database unavailable');
    budgetRepository.findByMonth.mockResolvedValue(budget());
    budgetRepository.save.mockRejectedValue(error);

    await expect(
      useCase.execute({ userId: 'u1', month: '2026-08', items: [item()] }),
    ).rejects.toBe(error);
  });
});
