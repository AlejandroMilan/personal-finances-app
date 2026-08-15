import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CATEGORY_REPOSITORY } from './application/ports/category.repository';
import { CreateCategoryUseCase } from './application/use-cases/create-category.use-case';
import { DeleteCategoryUseCase } from './application/use-cases/delete-category.use-case';
import { ListCategoriesUseCase } from './application/use-cases/list-categories.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/update-category.use-case';
import {
  CategoryModel,
  CategorySchema,
} from './infrastructure/persistence/category.schema';
import { MongoCategoryRepository } from './infrastructure/persistence/category.repository.mongo';
import { CategoriesController } from './presentation/categories.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CategoryModel.name, schema: CategorySchema },
    ]),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [CategoriesController],
  providers: [
    CreateCategoryUseCase,
    UpdateCategoryUseCase,
    DeleteCategoryUseCase,
    ListCategoriesUseCase,
    { provide: CATEGORY_REPOSITORY, useClass: MongoCategoryRepository },
  ],
  exports: [CATEGORY_REPOSITORY],
})
export class CategoriesModule {}
