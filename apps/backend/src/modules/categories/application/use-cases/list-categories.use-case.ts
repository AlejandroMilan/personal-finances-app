import { Inject, Injectable } from '@nestjs/common';
import { Category } from '../../domain/entities/category.entity';
import {
  CategoryRepository,
  CATEGORY_REPOSITORY,
} from '../ports/category.repository';

@Injectable()
export class ListCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(userId: string): Promise<Category[]> {
    return this.categoryRepository.findByUserId(userId);
  }
}
