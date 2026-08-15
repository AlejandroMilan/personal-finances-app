import { ConflictException, Injectable, Inject } from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryRepository,
  CATEGORY_REPOSITORY,
} from '../ports/category.repository';

export interface CreateCategoryInput {
  userId: string;
  name: string;
  color: string;
}

@Injectable()
export class CreateCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    const category = Category.create({
      userId: input.userId,
      name: input.name.trim(),
      color: input.color,
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
