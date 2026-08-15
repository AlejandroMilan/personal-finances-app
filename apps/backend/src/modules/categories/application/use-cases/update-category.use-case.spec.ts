import { ConflictException, NotFoundException } from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity';
import { UpdateCategoryUseCase } from './update-category.use-case';

describe('UpdateCategoryUseCase', () => {
  const categoryRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  let useCase: UpdateCategoryUseCase;

  const category = () =>
    Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateCategoryUseCase(categoryRepository);
  });

  it('throws NotFoundException when the category does not exist', async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ userId: 'u1', categoryId: 'missing', name: 'X' }),
    ).rejects.toThrow(NotFoundException);
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the category belongs to another user', async () => {
    categoryRepository.findById.mockResolvedValue(category());

    await expect(
      useCase.execute({ userId: 'u2', categoryId: 'c1', name: 'Hacked' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('updates the name and color of a category', async () => {
    const updated = category();
    categoryRepository.findById.mockResolvedValue(category());
    categoryRepository.save.mockResolvedValue(updated);

    const result = await useCase.execute({
      userId: 'u1',
      categoryId: 'c1',
      name: '  Groceries  ',
      color: '#7FA56E',
    });

    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'c1',
        name: 'Groceries',
        color: '#7FA56E',
      }),
    );
    expect(result).toBe(updated);
  });

  it('keeps existing values when no fields are provided', async () => {
    const updated = category();
    categoryRepository.findById.mockResolvedValue(category());
    categoryRepository.save.mockResolvedValue(updated);

    await useCase.execute({ userId: 'u1', categoryId: 'c1' });

    expect(categoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Food', color: '#2E6B4F' }),
    );
  });

  it('throws ConflictException when the new name already exists', async () => {
    const error = Object.assign(new Error('duplicate'), { code: 11000 });
    categoryRepository.findById.mockResolvedValue(category());
    categoryRepository.save.mockRejectedValue(error);

    await expect(
      useCase.execute({ userId: 'u1', categoryId: 'c1', name: 'Food' }),
    ).rejects.toThrow(ConflictException);
  });
});
