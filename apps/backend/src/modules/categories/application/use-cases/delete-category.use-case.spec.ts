import { NotFoundException } from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity';
import { DeleteCategoryUseCase } from './delete-category.use-case';

describe('DeleteCategoryUseCase', () => {
  const categoryRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const transactionRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    deleteByAccountId: jest.fn(),
    clearCategoryReferences: jest.fn(),
    summarize: jest.fn(),
  };
  let useCase: DeleteCategoryUseCase;

  const category = () =>
    Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date(),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteCategoryUseCase(
      categoryRepository,
      transactionRepository,
    );
  });

  it('throws NotFoundException when the category does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', categoryId: 'missing' }),
    ).rejects.toThrow(NotFoundException);
    expect(categoryRepository.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the category belongs to another user', async () => {
    categoryRepository.findById.mockResolvedValue(category());

    await expect(
      useCase.execute({ userId: 'u2', categoryId: 'c1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('deletes the category and clears its references in transactions', async () => {
    categoryRepository.findById.mockResolvedValue(category());

    await useCase.execute({ userId: 'u1', categoryId: 'c1' });

    expect(categoryRepository.delete).toHaveBeenCalledWith('c1');
    expect(transactionRepository.clearCategoryReferences).toHaveBeenCalledWith(
      'c1',
    );
  });
});
