import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  TransactionRepository,
  TRANSACTION_REPOSITORY,
} from '../../../transactions/application/ports/transaction.repository';
import {
  CategoryRepository,
  CATEGORY_REPOSITORY,
} from '../ports/category.repository';

export interface DeleteCategoryInput {
  userId: string;
  categoryId: string;
}

@Injectable()
export class DeleteCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: CategoryRepository,
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.userId !== input.userId) {
      throw new NotFoundException('Category not found');
    }

    await this.categoryRepository.delete(category.id);
    await this.transactionRepository.clearCategoryReferences(category.id);
  }
}
