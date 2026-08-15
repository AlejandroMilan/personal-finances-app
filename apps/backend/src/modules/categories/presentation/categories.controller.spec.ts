import { Test, TestingModule } from '@nestjs/testing';
import { TOKEN_SERVICE } from '../../auth/application/ports/token-service';
import { CreateCategoryUseCase } from '../application/use-cases/create-category.use-case';
import { DeleteCategoryUseCase } from '../application/use-cases/delete-category.use-case';
import { ListCategoriesUseCase } from '../application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from '../application/use-cases/update-category.use-case';
import { Category } from '../domain/entities/category.entity';
import { CategoriesController } from './categories.controller';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  const createCategory = { execute: jest.fn() };
  const listCategories = { execute: jest.fn() };
  const updateCategory = { execute: jest.fn() };
  const deleteCategory = { execute: jest.fn() };

  const user = { id: 'u1', email: 'ana@mail.com' };

  const category = () =>
    Category.restore({
      id: 'c1',
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CreateCategoryUseCase, useValue: createCategory },
        { provide: ListCategoriesUseCase, useValue: listCategories },
        { provide: UpdateCategoryUseCase, useValue: updateCategory },
        { provide: DeleteCategoryUseCase, useValue: deleteCategory },
        {
          provide: TOKEN_SERVICE,
          useValue: { sign: jest.fn(), verify: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('creates a category returning its view', async () => {
    createCategory.execute.mockResolvedValue(category());
    const dto: CreateCategoryDto = { name: 'Food', color: '#2E6B4F' };

    const response = await controller.create(user, dto);

    expect(createCategory.execute).toHaveBeenCalledWith({
      userId: 'u1',
      name: 'Food',
      color: '#2E6B4F',
    });
    expect(response).toEqual({ id: 'c1', name: 'Food', color: '#2E6B4F' });
  });

  it('lists the categories of the current user', async () => {
    listCategories.execute.mockResolvedValue([category()]);

    const response = await controller.list(user);

    expect(listCategories.execute).toHaveBeenCalledWith('u1');
    expect(response).toHaveLength(1);
    expect(response[0].name).toBe('Food');
  });

  it('updates a category returning its view', async () => {
    updateCategory.execute.mockResolvedValue(category());
    const dto: UpdateCategoryDto = { name: 'Groceries' };

    const response = await controller.update(user, 'c1', dto);

    expect(updateCategory.execute).toHaveBeenCalledWith({
      userId: 'u1',
      categoryId: 'c1',
      name: 'Groceries',
      color: undefined,
    });
    expect(response.name).toBe('Food');
  });

  it('deletes a category', async () => {
    await controller.remove(user, 'c1');

    expect(deleteCategory.execute).toHaveBeenCalledWith({
      userId: 'u1',
      categoryId: 'c1',
    });
  });
});
