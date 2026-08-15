import { Category } from '../../domain/entities/category.entity';
import { ListCategoriesUseCase } from './list-categories.use-case';

describe('ListCategoriesUseCase', () => {
  const categoryRepository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  let useCase: ListCategoriesUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ListCategoriesUseCase(categoryRepository);
  });

  it('returns the categories of the user', async () => {
    const category = Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date(),
    });
    categoryRepository.findByUserId.mockResolvedValue([category]);

    const result = await useCase.execute('u1');

    expect(categoryRepository.findByUserId).toHaveBeenCalledWith('u1');
    expect(result).toEqual([category]);
  });
});
