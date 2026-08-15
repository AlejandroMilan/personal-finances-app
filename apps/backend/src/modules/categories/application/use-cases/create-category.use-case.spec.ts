import { ConflictException } from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity';
import { CreateCategoryUseCase } from './create-category.use-case';

describe('CreateCategoryUseCase', () => {
  const categoryRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  let useCase: CreateCategoryUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateCategoryUseCase(categoryRepository);
  });

  it('creates a category trimming its name', async () => {
    const category = Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date(),
    });
    categoryRepository.save.mockResolvedValue(category);

    const result = await useCase.execute({
      userId: 'u1',
      name: '  Food  ',
      color: '#2E6B4F',
    });

    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', name: 'Food', color: '#2E6B4F' }),
    );
    expect(result).toBe(category);
  });

  it('throws ConflictException when the name already exists', async () => {
    const error = Object.assign(new Error('duplicate'), { code: 11000 });
    categoryRepository.save.mockRejectedValue(error);

    await expect(
      useCase.execute({ userId: 'u1', name: 'Food', color: '#2E6B4F' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rethrows errors that are not duplicate key errors', async () => {
    const error = new Error('boom');
    categoryRepository.save.mockRejectedValue(error);

    await expect(
      useCase.execute({ userId: 'u1', name: 'Food', color: '#2E6B4F' }),
    ).rejects.toThrow('boom');
  });
});
