import {
  BadRequestException,
  ConflictException,
  HttpStatus,
} from '@nestjs/common';
import {
  Budget,
  BudgetItemType,
  type BudgetItem,
  type BudgetProps,
} from '../../domain/entities/budget.entity';
import { CreateBudgetUseCase } from './create-budget.use-case';

describe('CreateBudgetUseCase', () => {
  const budgetRepository = {
    findByMonth: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    deleteByMonth: jest.fn(),
  };
  let useCase: CreateBudgetUseCase;

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

  const input = {
    userId: 'u1',
    month: '2026-08',
    items: [item()],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateBudgetUseCase(budgetRepository);
    budgetRepository.findByMonth.mockResolvedValue(null);
  });

  it('creates a budget for the authenticated user and returns the saved entity', async () => {
    const saved = budget();
    budgetRepository.save.mockResolvedValue(saved);

    await expect(useCase.execute(input)).resolves.toBe(saved);

    expect(budgetRepository.findByMonth).toHaveBeenCalledWith('u1', '2026-08');
    expect(budgetRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        month: '2026-08',
        items: input.items,
      }),
    );
  });

  it('throws ConflictException with status 409 when the month already has a budget', async () => {
    budgetRepository.findByMonth.mockResolvedValue(budget());

    let error: unknown;
    try {
      await useCase.execute(input);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getStatus()).toBe(HttpStatus.CONFLICT);
    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('maps a duplicate-key race from the repository to ConflictException', async () => {
    budgetRepository.save.mockRejectedValue({ code: 11000 });

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
  });

  it('maps invalid budget data to BadRequestException without saving', async () => {
    await expect(
      useCase.execute({ ...input, month: '2026-13' }),
    ).rejects.toThrow(BadRequestException);

    expect(budgetRepository.save).not.toHaveBeenCalled();
  });

  it('rethrows repository errors that are not duplicate-key errors', async () => {
    const error = new Error('database unavailable');
    budgetRepository.save.mockRejectedValue(error);

    await expect(useCase.execute(input)).rejects.toBe(error);
  });
});
