import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryRepository,
  CATEGORY_REPOSITORY,
} from '../ports/category.repository';

export interface UpdateCategoryInput {
  userId: string;
  categoryId: string;
  name?: string;
  color?: string;
}

@Injectable()
export class UpdateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: UpdateCategoryInput): Promise<Category> {
    const existing = await this.categoryRepository.findById(input.categoryId);
    if (!existing || existing.userId !== input.userId) {
      throw new NotFoundException('Category not found');
    }

    const category = Category.restore({
      id: existing.id,
      userId: existing.userId,
      name: input.name?.trim() ?? existing.name,
      color: input.color ?? existing.color,
      createdAt: existing.createdAt,
    });

    try {
      return await this.categoryRepository.save(category);
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Category name already exists');
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }
}
